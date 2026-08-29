// Google Play Developer API の共通部分(サービスアカウントの JWT → アクセストークン、fetch)。play-*.mjs から使う。
// 認証は eas.json の submit.production.android.serviceAccountKeyPath(PLAY_SA_KEY で上書き可)
import { Buffer } from 'node:buffer';
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
export const PKG = process.env.PLAY_PACKAGE ?? 'com.matomebeta_app';
const KEY_PATH = resolve(
  ROOT,
  process.env.PLAY_SA_KEY ??
    JSON.parse(readFileSync(resolve(ROOT, 'eas.json'), 'utf8')).submit.production.android.serviceAccountKeyPath,
);

const sa = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
const b64url = (b) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

let cached = null;
export async function token() {
  if (cached && cached.exp > Date.now() / 1000 + 60) return cached.value;
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
  const json = await res.json();
  cached = { value: json.access_token, exp: now + (json.expires_in ?? 3600) };
  return cached.value;
}

export const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`;
export const UPLOAD = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PKG}`;

export async function api(method, url, body, contentType = 'application/json') {
  const res = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${await token()}`, ...(body ? { 'content-type': contentType } : {}) },
    body: body ? (contentType === 'application/json' ? JSON.stringify(body) : body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url.replace(BASE, '').replace(UPLOAD, '')}: ${res.status} ${text.slice(0, 600)}`);
  return text ? JSON.parse(text) : {};
}
