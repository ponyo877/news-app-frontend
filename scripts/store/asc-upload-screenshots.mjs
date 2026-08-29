#!/usr/bin/env node
// App Store Connect API でスクリーンショットを差し替える(ブラウザ不要・順番も API で確定させる)。
//
//   node scripts/store/asc-upload-screenshots.mjs --dry-run            # バージョンの状態と今のセットを表示するだけ
//   node scripts/store/asc-upload-screenshots.mjs                      # 編集可能なバージョンに out/ の iPhone 7枚 + iPad 3枚を上げる
//   node scripts/store/asc-upload-screenshots.mjs --version 1.54       # 編集可能なバージョンが無ければ 1.54 を作ってから上げる
//   node scripts/store/asc-upload-screenshots.mjs --only iphone        # iphone / ipad に絞る
//
// 認証: ~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8(既定 ZNB52NZ7Q6)。Issuer ID は
// ASC → ユーザとアクセス → 統合 → App Store Connect API の先頭に出る値(--issuer か ASC_ISSUER_ID で上書き可)。
//
// 手順: 編集可能なバージョンを探す(無ければ --version で作る。作るだけなら何も公開されない)
//       → ja のローカリゼーション → 表示タイプごとのスクリーンショットセット(無ければ作る)
//       → 既存を全削除 → 1枚ずつ 予約 → 分割 PUT → コミット(MD5)→ 処理完了待ち
//       → セットの relationships を並び順どおりに置き換える(UI のドラッグ並べ替えが効かない対策)
//
// 表示タイプ: iPhone 6.9インチ = APP_IPHONE_67(6.7 と共通)/ iPad 13インチ = APP_IPAD_PRO_3GEN_129
import { createHash, createSign } from 'node:crypto';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { homedir } from 'node:os';

const ROOT = resolve(import.meta.dirname, '../..');
const OUT = resolve(ROOT, 'store-assets/out');
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : dflt; };
const ISSUER = opt('--issuer', process.env.ASC_ISSUER_ID ?? '8e5079df-4827-4f89-b7cd-b77a2b19e16c');
const KEY_ID = opt('--key', 'ZNB52NZ7Q6');
const APP_ID = opt('--app', '1546424384');
const VERSION = opt('--version', null);
const LOCALE = opt('--locale', 'ja');
const ONLY = opt('--only', null);
const DRY = args.includes('--dry-run');

const SETS = [
  { key: 'iphone', type: 'APP_IPHONE_67', files: [1, 2, 3, 4, 5, 6, 7].map((n) => `ios-${n}.png`) },
  { key: 'ipad', type: 'APP_IPAD_PRO_3GEN_129', files: [1, 2, 4].map((n) => `ipad-${n}.png`) },
].filter((s) => !ONLY || s.key === ONLY);

const KEY = readFileSync(resolve(homedir(), '.appstoreconnect/private_keys', `AuthKey_${KEY_ID}.p8`), 'utf8');
const b64url = (b) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const h = b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }));
  const p = b64url(JSON.stringify({ iss: ISSUER, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' }));
  const s = createSign('SHA256');
  s.update(`${h}.${p}`);
  return `${h}.${p}.${b64url(s.sign({ key: KEY, dsaEncoding: 'ieee-p1363' }))}`;
}
const API = 'https://api.appstoreconnect.apple.com/v1';
async function api(method, path, body) {
  const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    method,
    headers: { authorization: `Bearer ${jwt()}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : {};
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  await api('PATCH', `/appScreenshotSets/${set.id}/relationships/appScreenshots`, { data: ids.map((id) => ({ type: 'appScreenshots', id })) });
  const now = await api('GET', `/appScreenshotSets/${set.id}/appScreenshots?limit=20`);
  console.log(`${spec.type}: 並び順 ${now.data.map((x) => x.attributes.fileName).join(' → ')}`);
}
console.log(`done: ${version.attributes.versionString} の「プレビューとスクリーンショット」に反映(公開はこのバージョンの提出時)`);
