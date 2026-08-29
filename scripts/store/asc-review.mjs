#!/usr/bin/env node
// App Store Connect の審査提出(reviewSubmissions)を見る・取り下げる。
//
//   node scripts/store/asc-review.mjs status     # バージョンの状態と審査提出の一覧
//   node scripts/store/asc-review.mjs withdraw   # 審査待ち(WAITING_FOR_REVIEW)の提出をキャンセルして、バージョンを編集可能に戻す
//   node scripts/store/asc-review.mjs submit --build 58 --notes store-assets/release-notes/ios-1.53.txt [--dry-run]
//                                                # 編集可能なバージョンに ビルドを添付 → 「このバージョンの新機能」を設定 → 審査へ提出
//
// 取り下げると審査待ちの順番は失う。submit は `eas submit -p ios --path <ipa>` でビルドを ASC に上げた後、
// 処理完了(VALID)を待ってから添付する。輸出コンプライアンスは infoPlist の ITSAppUsesNonExemptEncryption=false で
// 済んでいるはずだが、未回答なら false(HTTPS のみ=免除)を設定する。
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { api, APP_ID, sleep } from './asc-api.mjs';

const args = process.argv.slice(2);
const cmd = args[0] ?? 'status';
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : dflt; };
const DRY = args.includes('--dry-run');
const EDITABLE = new Set(['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY']);

const versions = await api('GET', `/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=5`);
for (const v of versions.data) console.log(`version ${v.attributes.versionString}: ${v.attributes.appStoreState}`);

const subs = await api('GET', `/apps/${APP_ID}/reviewSubmissions?filter[platform]=IOS&limit=5`);
for (const s of subs.data) console.log(`reviewSubmission ${s.id}: ${s.attributes.state} (${s.attributes.submittedDate ?? '未提出'})`);

if (cmd === 'withdraw') {
  const target = subs.data.find((s) => s.attributes.state === 'WAITING_FOR_REVIEW');
  if (!target) { console.log('WAITING_FOR_REVIEW の提出が無い(審査中 IN_REVIEW は取り下げられない)'); process.exit(1); }
  const items = await api('GET', `/reviewSubmissions/${target.id}/items`);
  console.log(`取り下げる提出 ${target.id}: item ${items.data.map((i) => `${i.type}/${i.attributes.state}`).join(', ')}`);
  await api('PATCH', `/reviewSubmissions/${target.id}`, { data: { type: 'reviewSubmissions', id: target.id, attributes: { canceled: true } } });
  for (let i = 0; i < 10; i++) {
    await sleep(3000);
    const after = await api('GET', `/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=1`);
    const v = after.data[0];
    console.log(`  version ${v.attributes.versionString}: ${v.attributes.appStoreState}`);
    if (v.attributes.appStoreState !== 'WAITING_FOR_REVIEW') break;
  }
  const s = (await api('GET', `/reviewSubmissions/${target.id}`)).data;
  console.log(`reviewSubmission ${target.id}: ${s.attributes.state}`);
  console.log('done: 取り下げた。再提出はしていない');
}

if (cmd === 'submit') {
  const buildNumber = opt('--build', null);
  const notesPath = opt('--notes', null);
  if (!buildNumber) throw new Error('--build <ビルド番号> が要る');
  const version = versions.data.find((v) => EDITABLE.has(v.attributes.appStoreState));
  if (!version) throw new Error('編集可能なバージョンが無い');
  console.log(`version ${version.attributes.versionString} (${version.id}, ${version.attributes.appStoreState})`);

  // 1) ビルドの処理完了を待つ(eas submit の直後は PROCESSING。10〜20分かかる)
  let build = null;
  for (let i = 0; i < 90; i++) {
    const r = await api('GET', `/builds?filter[app]=${APP_ID}&filter[version]=${buildNumber}&filter[preReleaseVersion.version]=${version.attributes.versionString}&limit=5`);
    build = r.data[0] ?? null;
    const st = build?.attributes.processingState ?? '(未着)';
    console.log(`  build ${buildNumber}: ${st}`);
    if (st === 'VALID') break;
    if (st === 'FAILED' || st === 'INVALID') throw new Error(`build ${buildNumber} が ${st}`);
    if (DRY && !build) break;
    await sleep(20000);
  }
  if (!build || build.attributes.processingState !== 'VALID') {
    if (DRY) { console.log('dry-run: ビルドが VALID になったら添付→提出する'); process.exit(0); }
    throw new Error('ビルドの処理が終わらない');
  }
  const notes = notesPath ? readFileSync(resolve(notesPath), 'utf8').trim() : null;
  if (DRY) {
    console.log(`dry-run: build ${build.id} を添付し、whatsNew を設定して提出する:\n${notes ?? '(whatsNew は変更なし)'}`);
    process.exit(0);
  }

  // 2) 輸出コンプライアンス(未回答ならビルドを提出できない)
  if (build.attributes.usesNonExemptEncryption == null) {
    await api('PATCH', `/builds/${build.id}`, { data: { type: 'builds', id: build.id, attributes: { usesNonExemptEncryption: false } } });
    console.log('  export compliance: usesNonExemptEncryption=false を設定');
  }

  // 3) ビルドを添付
  await api('PATCH', `/appStoreVersions/${version.id}/relationships/build`, { data: { type: 'builds', id: build.id } });
  console.log(`  attached build ${buildNumber} (${build.id})`);

  // 4) このバージョンの新機能
  if (notes) {
    const locs = await api('GET', `/appStoreVersions/${version.id}/appStoreVersionLocalizations`);
    const loc = locs.data.find((l) => l.attributes.locale === 'ja') ?? locs.data[0];
    await api('PATCH', `/appStoreVersionLocalizations/${loc.id}`, { data: { type: 'appStoreVersionLocalizations', id: loc.id, attributes: { whatsNew: notes } } });
    console.log(`  whatsNew(${loc.attributes.locale}) を設定`);
  }

  // 5) 審査へ提出(reviewSubmission → item → submitted)
  const submission = (await api('POST', '/reviewSubmissions', {
    data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: { data: { type: 'apps', id: APP_ID } } } },
  })).data;
  await api('POST', '/reviewSubmissionItems', {
    data: { type: 'reviewSubmissionItems', relationships: { reviewSubmission: { data: { type: 'reviewSubmissions', id: submission.id } }, appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } } },
  });
  await api('PATCH', `/reviewSubmissions/${submission.id}`, { data: { type: 'reviewSubmissions', id: submission.id, attributes: { submitted: true } } });
  const after = (await api('GET', `/reviewSubmissions/${submission.id}`)).data;
  const v = (await api('GET', `/appStoreVersions/${version.id}`)).data;
  console.log(`submitted: reviewSubmission ${submission.id} ${after.attributes.state} / version ${v.attributes.versionString} ${v.attributes.appStoreState}`);
}
