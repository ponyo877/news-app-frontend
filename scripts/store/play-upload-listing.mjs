#!/usr/bin/env node
// Google Play Developer API でストア掲載情報の画像(スマホ用スクリーンショット 7枚・フィーチャーグラフィック)を差し替える。
//
//   node scripts/store/play-upload-listing.mjs --dry-run   # 今の掲載画像の枚数を表示するだけ(編集は破棄)
//   node scripts/store/play-upload-listing.mjs             # 差し替えて commit(掲載情報の審査に自動で送られる)
//   node scripts/store/play-upload-listing.mjs --video https://www.youtube.com/watch?v=XXXX   # プロモ動画の URL も設定(画像と一緒に commit)
//   node scripts/store/play-upload-listing.mjs --video URL --no-images                          # 動画 URL だけ
//
// 認証: eas.json の submit.production.android.serviceAccountKeyPath と同じサービスアカウント JSON
//       (--key で上書き可)。Play Console の「ユーザーと権限」でストア掲載情報の編集権限が要る。
//       権限が無いと画像のアップロードまでは通り、最後の commit だけ 403 PERMISSION_DENIED で落ちる(2026-08-29 に確認)。
// 手順: edit を作る → listings/ja-JP の各 imageType を deleteall → 1枚ずつ upload → edit を commit。
//       タブレット用(sevenInch/tenInch)は Android 実機の画像が無いので触らない(iPad の画像は iOS の UI)。
import { createSign } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const OUT = resolve(ROOT, 'store-assets/out');
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : dflt; };
const DRY = args.includes('--dry-run');
const VIDEO = opt('--video', null);            // YouTube の動画 URL(公開か限定公開・収益化オフ・埋め込み可)
const NO_IMAGES = args.includes('--no-images');
const PKG = opt('--package', 'com.matomebeta_app');
const LANG = opt('--lang', 'ja-JP');
const KEY_PATH = resolve(ROOT, opt('--key', JSON.parse(readFileSync(resolve(ROOT, 'eas.json'), 'utf8')).submit.production.android.serviceAccountKeyPath));

const UPLOADS = [
  { imageType: 'phoneScreenshots', files: [1, 2, 3, 4, 5, 6, 7].map((n) => `play-${n}.png`) },
  { imageType: 'featureGraphic', files: ['feature-graphic.png'] },
];
const ALL_TYPES = ['phoneScreenshots', 'sevenInchScreenshots', 'tenInchScreenshots', 'featureGraphic', 'icon', 'tvBanner', 'tvScreenshots', 'wearScreenshots'];

// ---- サービスアカウントの JWT → アクセストークン ---------------------------
const sa = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
const b64url = (b) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
async function token() {
  const now = Math.floor(Date.now() / 1000);
  const h = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const p = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: sa.token_uri, iat: now, exp: now + 3600 }));
  const s = createSign('RSA-SHA256');
  s.update(`${h}.${p}`);
  const assertion = `${h}.${p}.${b64url(s.sign(sa.private_key))}`;
  const res = await fetch(sa.token_uri, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!res.ok) throw new Error(`token: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}
const TOKEN = await token();
const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`;
const UPLOAD = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PKG}`;
async function api(method, url, body, contentType = 'application/json') {
  const res = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${TOKEN}`, ...(body ? { 'content-type': contentType } : {}) },
    body: body ? (contentType === 'application/json' ? JSON.stringify(body) : body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url.replace(BASE, '').replace(UPLOAD, '')}: ${res.status} ${text.slice(0, 600)}`);
  return text ? JSON.parse(text) : {};
}

// ---- edit ------------------------------------------------------------------
let committed = false;
const edit = await api('POST', `${BASE}/edits`, {});
const E = `${BASE}/edits/${edit.id}`;
console.log(`edit ${edit.id}`);
try {
  const listings = await api('GET', `${E}/listings`);
  console.log(`listings: ${(listings.listings ?? []).map((l) => l.language).join(', ')}`);
  if (!(listings.listings ?? []).some((l) => l.language === LANG)) throw new Error(`掲載情報に ${LANG} が無い`);
  for (const t of ALL_TYPES) {
    const r = await api('GET', `${E}/listings/${LANG}/${t}`);
    const n = (r.images ?? []).length;
    if (n) console.log(`  ${t}: ${n}枚`);
  }
  const listing = await api('GET', `${E}/listings/${LANG}`);
  console.log(`  video: ${listing.video ?? '(none)'}`);
  if (DRY) {
    console.log('dry-run: ここまで。edit は破棄します');
  } else {
    if (VIDEO) {
      // listings.update は全フィールドを送る(title / shortDescription / fullDescription を落とすと消える)
      await api('PUT', `${E}/listings/${LANG}`, { ...listing, video: VIDEO });
      console.log(`video: ${VIDEO}`);
    }
    for (const u of NO_IMAGES ? [] : UPLOADS) {
      const files = u.files.map((f) => resolve(OUT, f));
      const missing = files.filter((f) => !existsSync(f));
      if (missing.length) throw new Error(`無いファイル: ${missing.join(', ')}(先に npm run store:build)`);
      const del = await api('DELETE', `${E}/listings/${LANG}/${u.imageType}`);
      console.log(`${u.imageType}: 既存 ${(del.deleted ?? []).length}枚を削除`);
      for (const f of files) {
        const r = await api('POST', `${UPLOAD}/edits/${edit.id}/listings/${LANG}/${u.imageType}?uploadType=media`, readFileSync(f), 'image/png');
        console.log(`  ✓ ${f.split('/').pop()} (${r.image?.id})`);
      }
    }
    await api('POST', `${E}:commit`, {});
    committed = true;
    console.log('committed: Play Console の掲載情報に反映(掲載情報の審査に自動送信)');
  }
} finally {
  // dry-run と失敗時は edit を捨てる(commit 前の edit は掲載情報に影響しない)
  if (!committed) await api('DELETE', E).catch(() => {});
}
