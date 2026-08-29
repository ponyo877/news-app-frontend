#!/usr/bin/env node
// App Store Connect の審査提出(reviewSubmissions)を見る・取り下げる。
//
//   node scripts/store/asc-review.mjs status     # バージョンの状態と審査提出の一覧
//   node scripts/store/asc-review.mjs withdraw   # 審査待ち(WAITING_FOR_REVIEW)の提出をキャンセルして、バージョンを編集可能に戻す
//
// 取り下げると審査待ちの順番は失う。再提出は ASC の「審査へ提出」から(このスクリプトは提出しない)。
import { api, APP_ID, sleep } from './asc-api.mjs';

const cmd = process.argv[2] ?? 'status';

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
