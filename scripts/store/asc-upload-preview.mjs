#!/usr/bin/env node
// App Store Connect API で App プレビュー(動画)を iPhone 6.9インチ枠に上げ、ポスターフレームを指定する(ブラウザ不要)。
//
//   node scripts/store/asc-upload-preview.mjs --dry-run             # バージョンの状態と今のプレビューセットを表示するだけ
//   node scripts/store/asc-upload-preview.mjs                       # 編集可能なバージョンに promo/out/deliver/appstore-886x1920.mp4 を上げる
//   node scripts/store/asc-upload-preview.mjs --version 1.54        # 編集可能なバージョンが無ければ 1.54 を作ってから上げる
//   node scripts/store/asc-upload-preview.mjs --poster 00:00:10:10  # ポスターフレーム(HH:MM:SS:FF、30fps)を指定
//
// 認証・バージョン選択は asc-upload-screenshots.mjs と同じ(AuthKey_ZNB52NZ7Q6.p8 / Issuer ID)。
// 審査中のバージョンがあると新バージョンを作れない(409)ので、1.53 の審査が終わってから --version 1.54 で実行する。
//
// 手順: 編集可能なバージョン → ja のローカリゼーション → appPreviewSets(APP_IPHONE_67 = 6.9/6.7インチ共通、無ければ作る)
//       → 既存を削除 → 予約 → 分割 PUT → コミット(MD5)→ 処理完了待ち(動画は数分かかる)→ previewFrameTimeCode を設定
import { createHash, createSign } from 'node:crypto';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { homedir } from 'node:os';

const ROOT = resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : dflt; };
const ISSUER = opt('--issuer', process.env.ASC_ISSUER_ID ?? '8e5079df-4827-4f89-b7cd-b77a2b19e16c');
const KEY_ID = opt('--key', 'ZNB52NZ7Q6');
const APP_ID = opt('--app', '1546424384');
const VERSION = opt('--version', null);
const LOCALE = opt('--locale', 'ja');
const FILE = resolve(ROOT, opt('--file', 'promo/out/deliver/appstore-886x1920.mp4'));
/** ポスターフレーム。既定は scripts/poster.ts の posterFrame(310f @30fps = 10 秒 10 フレーム) */
const POSTER = opt('--poster', '00:00:10:10');
const DISPLAY_TYPE = opt('--display', 'IPHONE_67');
const DRY = args.includes('--dry-run');

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
const EDITABLE = new Set(['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY']);

// 1) バージョン
const versions = await api('GET', `/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=10`);
for (const v of versions.data.slice(0, 3)) console.log(`version ${v.attributes.versionString}: ${v.attributes.appStoreState}`);
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
  console.log('編集可能なバージョンが無い(審査中/配信済みのみ)。審査が終わってから --version 1.54 で作成する');
  process.exit(DRY ? 0 : 1);
}
console.log(`using version ${version.attributes.versionString} (${version.id}, ${version.attributes.appStoreState})`);

// 2) ローカリゼーション
const locs = await api('GET', `/appStoreVersions/${version.id}/appStoreVersionLocalizations`);
const loc = locs.data.find((l) => l.attributes.locale === LOCALE) ?? locs.data[0];
if (!loc) throw new Error('ローカリゼーションがありません');
console.log(`localization ${loc.attributes.locale} (${loc.id})`);

// 3) プレビューセット
const sets = await api('GET', `/appStoreVersionLocalizations/${loc.id}/appPreviewSets`);
for (const s of sets.data) {
  const previews = await api('GET', `/appPreviewSets/${s.id}/appPreviews`);
  console.log(`  set ${s.attributes.previewType} (${s.id}): ${previews.data.length}本 ${previews.data.map((x) => `${x.attributes.fileName}[${x.attributes.assetDeliveryState?.state}]`).join(', ')}`);
}
if (DRY) { console.log('dry-run: ここまで。アップロードは行いません'); process.exit(0); }
// --poster-only: 既にあるプレビューのポスターフレームだけ設定し直す(アップロード直後の PATCH では既定の 5 秒に戻ることがある)
if (args.includes('--poster-only')) {
  const set0 = sets.data.find((s) => s.attributes.previewType === DISPLAY_TYPE);
  const cur = set0 ? (await api('GET', `/appPreviewSets/${set0.id}/appPreviews`)).data[0] : null;
  if (!cur) throw new Error('プレビューが無い');
  await api('PATCH', `/appPreviews/${cur.id}`, { data: { type: 'appPreviews', id: cur.id, attributes: { previewFrameTimeCode: POSTER } } });
  for (let i = 0; i < 60; i++) {
    const a = (await api('GET', `/appPreviews/${cur.id}`)).data.attributes;
    if (a.previewFrameTimeCode === POSTER && a.previewImage?.templateUrl) { console.log(`poster set: ${a.previewFrameTimeCode}`); process.exit(0); }
    await sleep(5000);
  }
  console.log('poster: 設定は送ったが反映確認が取れなかった(ASC で確認)');
  process.exit(0);
}
if (!existsSync(FILE)) throw new Error(`${FILE} が無い(cd promo && npm run render:appstore && npm run deliver)`);

let set = sets.data.find((s) => s.attributes.previewType === DISPLAY_TYPE);
if (!set) {
  set = (await api('POST', '/appPreviewSets', {
    data: { type: 'appPreviewSets', attributes: { previewType: DISPLAY_TYPE }, relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: loc.id } } } },
  })).data;
  console.log(`created set ${DISPLAY_TYPE} (${set.id})`);
}
const old = await api('GET', `/appPreviewSets/${set.id}/appPreviews`);
for (const p of old.data) await api('DELETE', `/appPreviews/${p.id}`);
console.log(`${DISPLAY_TYPE}: 既存 ${old.data.length}本を削除`);

// 4) 予約 → 分割アップロード → コミット → 処理待ち
const bytes = readFileSync(FILE);
const reserve = (await api('POST', '/appPreviews', {
  data: {
    type: 'appPreviews',
    attributes: { fileName: basename(FILE), fileSize: statSync(FILE).size, previewFrameTimeCode: POSTER },
    relationships: { appPreviewSet: { data: { type: 'appPreviewSets', id: set.id } } },
  },
})).data;
console.log(`reserved ${reserve.id}: ${reserve.attributes.uploadOperations.length} parts`);
for (const op of reserve.attributes.uploadOperations) {
  const headers = Object.fromEntries((op.requestHeaders ?? []).map((h) => [h.name, h.value]));
  const res = await fetch(op.url, { method: op.method, headers, body: bytes.subarray(op.offset, op.offset + op.length) });
  if (!res.ok) throw new Error(`upload part failed: ${res.status} ${await res.text()}`);
}
const md5 = createHash('md5').update(bytes).digest('hex');
await api('PATCH', `/appPreviews/${reserve.id}`, {
  data: { type: 'appPreviews', id: reserve.id, attributes: { uploaded: true, sourceFileChecksum: md5, previewFrameTimeCode: POSTER } },
});
console.log('uploaded. Apple 側の処理を待つ(数分)');
for (let i = 0; i < 200; i++) {
  const a = (await api('GET', `/appPreviews/${reserve.id}`)).data.attributes;
  const st = a.assetDeliveryState?.state;
  if (st === 'COMPLETE') {
    console.log(`done: ${a.fileName} ${a.videoUrl ? '' : ''}poster=${a.previewFrameTimeCode} → ${version.attributes.versionString} の「プレビューとスクリーンショット」に反映(公開はこのバージョンの提出時)`);
    process.exit(0);
  }
  if (st === 'FAILED') throw new Error(JSON.stringify(a.assetDeliveryState.errors));
  await sleep(5000);
}
throw new Error('処理が終わらない(ASC で状態を確認)');
