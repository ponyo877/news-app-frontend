// App Store Connect API の共通部分(JWT と fetch)。asc-*.mjs から使う。
//
// 認証: ~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8(既定 ZNB52NZ7Q6)。Issuer ID は
// ASC → ユーザとアクセス → 統合 → App Store Connect API の先頭に出る値(ASC_ISSUER_ID で上書き可)。
import { Buffer } from 'node:buffer';
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

export const APP_ID = process.env.ASC_APP_ID ?? '1546424384';
const ISSUER = process.env.ASC_ISSUER_ID ?? '8e5079df-4827-4f89-b7cd-b77a2b19e16c';
const KEY_ID = process.env.ASC_KEY_ID ?? 'ZNB52NZ7Q6';
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
export async function api(method, path, body) {
  const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    method,
    headers: { authorization: `Bearer ${jwt()}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : {};
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
