#!/usr/bin/env node
// App Store Connect API でスクリーンショットを差し替える(ブラウザ不要・順番も API で確定させる)。
//
//   node scripts/store/asc-upload-screenshots.mjs --dry-run            # バージョンの状態と今のセットを表示するだけ
//   node scripts/store/asc-upload-screenshots.mjs                      # 編集可能なバージョンに out/ の iPhone 7枚 + iPad 3枚を上げる
//   node scripts/store/asc-upload-screenshots.mjs --version 1.54       # 編集可能なバージョンが無ければ 1.54 を作ってから上げる
//   node scripts/store/asc-upload-screenshots.mjs --only iphone        # iphone / ipad に絞る
//   node scripts/store/asc-upload-screenshots.mjs --delete-legacy     # 6.9インチ/13インチ以外の古いセット(6.5・5.5インチ、12.9インチ第2世代)を消す。
//                                                                     # 残っていると、その画面サイズの端末には古い画像が出続ける(ASC は無いサイズにだけ 6.9/13 を流用する)
//
// 認証は asc-api.mjs(~/.appstoreconnect/private_keys/AuthKey_ZNB52NZ7Q6.p8)。審査提出の取り下げは asc-review.mjs。
//
// 手順: 編集可能なバージョンを探す(無ければ --version で作る。作るだけなら何も公開されない)
//       → ja のローカリゼーション → 表示タイプごとのスクリーンショットセット(無ければ作る)
//       → 既存を全削除 → 1枚ずつ 予約 → 分割 PUT → コミット(MD5)→ 処理完了待ち
//       → セットの relationships を並び順どおりに置き換える(UI のドラッグ並べ替えが効かない対策)
//
// 表示タイプ: iPhone 6.9インチ = APP_IPHONE_67(6.7 と共通)/ iPad 13インチ = APP_IPAD_PRO_3GEN_129
import { createHash } from 'node:crypto';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { api, APP_ID, sleep } from './asc-api.mjs';

const ROOT = resolve(import.meta.dirname, '../..');
const OUT = resolve(ROOT, 'store-assets/out');
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : dflt; };
const VERSION = opt('--version', null);
const LOCALE = opt('--locale', 'ja');
const ONLY = opt('--only', null);
const DRY = args.includes('--dry-run');
const DELETE_LEGACY = args.includes('--delete-legacy');

const SETS = [
  { key: 'iphone', type: 'APP_IPHONE_67', files: [1, 2, 3, 4, 5, 6, 7].map((n) => `ios-${n}.png`) },
  { key: 'ipad', type: 'APP_IPAD_PRO_3GEN_129', files: [1, 2, 4].map((n) => `ipad-${n}.png`) },
].filter((s) => !ONLY || s.key === ONLY);

// 提出後(WAITING_FOR_REVIEW 以降)はメタデータがロックされるので編集可能とみなさない
const EDITABLE = new Set(['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY']);

// 1) バージョン
const versions = await api('GET', `/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=10`);
for (const v of versions.data) console.log(`version ${v.attributes.versionString}: ${v.attributes.appStoreState}`);
let version = versions.data.find((v) => EDITABLE.has(v.attributes.appStoreState));
if (!version && VERSION) {
  const same = versions.data.find((v) => v.attributes.versionString === VERSION);
  if (same) throw new Error(`version ${VERSION} は既にあり ${same.attributes.appStoreState} で編集不可`);
  if (DRY) { console.log(`dry-run: 編集可能なバージョンが無い。--version ${VERSION} を作成することになる`); process.exit(0); }
  version = (await api('POST', '/appStoreVersions', {
    data: { type: 'appStoreVersions', attributes: { platform: 'IOS', versionString: VERSION }, relationships: { app: { data: { type: 'apps', id: APP_ID } } } },
  })).data;
  console.log(`created version ${VERSION} (${version.id})`);
}
if (!version) {
  console.log('編集可能なバージョンが無い(審査中/配信済みのみ)。新しい番号を --version で指定して作成する');
  process.exit(DRY ? 0 : 1);
}
console.log(`using version ${version.attributes.versionString} (${version.id}, ${version.attributes.appStoreState})`);

// 2) ローカリゼーション
const locs = await api('GET', `/appStoreVersions/${version.id}/appStoreVersionLocalizations`);
const loc = locs.data.find((l) => l.attributes.locale === LOCALE) ?? locs.data[0];
if (!loc) throw new Error('ローカリゼーションがありません');
console.log(`localization ${loc.attributes.locale} (${loc.id})`);

// 3) セット
const sets = await api('GET', `/appStoreVersionLocalizations/${loc.id}/appScreenshotSets`);
for (const s of sets.data) {
  const shots = await api('GET', `/appScreenshotSets/${s.id}/appScreenshots?limit=20`);
  console.log(`  set ${s.attributes.screenshotDisplayType} (${s.id}): ${shots.data.length}枚 ${shots.data.map((x) => x.attributes.fileName).join(', ')}`);
}
if (DRY) { console.log('dry-run: ここまで。アップロードは行いません'); process.exit(0); }
if (DELETE_LEGACY) {
  const keep = new Set(SETS.map((s) => s.type));
  for (const s of sets.data.filter((s) => !keep.has(s.attributes.screenshotDisplayType))) {
    await api('DELETE', `/appScreenshotSets/${s.id}`);
    console.log(`deleted legacy set ${s.attributes.screenshotDisplayType} (${s.id})`);
  }
  process.exit(0);
}

async function uploadOne(setId, file) {
  const bytes = readFileSync(file);
  const size = statSync(file).size;
  const reserve = (await api('POST', '/appScreenshots', {
    data: { type: 'appScreenshots', attributes: { fileName: basename(file), fileSize: size }, relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } } } },
  })).data;
  for (const op of reserve.attributes.uploadOperations) {
    const headers = Object.fromEntries((op.requestHeaders ?? []).map((h) => [h.name, h.value]));
    const res = await fetch(op.url, { method: op.method, headers, body: bytes.subarray(op.offset, op.offset + op.length) });
    if (!res.ok) throw new Error(`upload part failed: ${res.status} ${await res.text()}`);
  }
  const md5 = createHash('md5').update(bytes).digest('hex');
  await api('PATCH', `/appScreenshots/${reserve.id}`, { data: { type: 'appScreenshots', id: reserve.id, attributes: { uploaded: true, sourceFileChecksum: md5 } } });
  for (let i = 0; i < 60; i++) {
    const st = (await api('GET', `/appScreenshots/${reserve.id}`)).data.attributes.assetDeliveryState;
    if (st?.state === 'COMPLETE') return reserve.id;
    if (st?.state === 'FAILED') throw new Error(`${basename(file)}: ${JSON.stringify(st.errors)}`);
    await sleep(3000);
  }
  throw new Error(`${basename(file)}: 処理が終わらない`);
}

for (const spec of SETS) {
  const files = spec.files.map((f) => resolve(OUT, f));
  const missing = files.filter((f) => !existsSync(f));
  if (missing.length) throw new Error(`無いファイル: ${missing.join(', ')}(先に npm run store:build)`);
  let set = sets.data.find((s) => s.attributes.screenshotDisplayType === spec.type);
  if (!set) {
    set = (await api('POST', '/appScreenshotSets', {
      data: { type: 'appScreenshotSets', attributes: { screenshotDisplayType: spec.type }, relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: loc.id } } } },
    })).data;
    console.log(`created set ${spec.type} (${set.id})`);
  }
  const old = await api('GET', `/appScreenshotSets/${set.id}/appScreenshots?limit=20`);
  for (const s of old.data) await api('DELETE', `/appScreenshots/${s.id}`);
  console.log(`${spec.type}: 既存 ${old.data.length}枚を削除`);
  const ids = [];
  for (const f of files) {
    ids.push(await uploadOne(set.id, f));
    console.log(`  ✓ ${basename(f)}`);
  }
  // 1枚ずつ完了を待って上げているので通常は到着順=指定順。ずれていたときだけ、いま入っている集合そのもので並べ直す
  // (relationships の置き換えは reorder 専用で、集合が違うと 409 "Can't Add/Remove Relationship when reorder Set")
  let now = await api('GET', `/appScreenshotSets/${set.id}/appScreenshots?limit=20`);
  const current = now.data.map((x) => x.id);
  const want = ids.filter((id) => current.includes(id)).concat(current.filter((id) => !ids.includes(id)));
  if (want.join() !== current.join()) {
    await api('PATCH', `/appScreenshotSets/${set.id}/relationships/appScreenshots`, { data: want.map((id) => ({ type: 'appScreenshots', id })) });
    now = await api('GET', `/appScreenshotSets/${set.id}/appScreenshots?limit=20`);
  }
  console.log(`${spec.type}: 並び順 ${now.data.map((x) => x.attributes.fileName).join(' → ')}`);
}
console.log(`done: ${version.attributes.versionString} の「プレビューとスクリーンショット」に反映(公開はこのバージョンの提出時)`);
