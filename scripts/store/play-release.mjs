#!/usr/bin/env node
// Google Play の製品版(または指定トラック)に AAB を上げてリリースを作る(Play Console 不要)。
//
//   node scripts/store/play-release.mjs --aab build-1.53-b60.aab --notes release-notes/android.txt --rollout 0.1
//   node scripts/store/play-release.mjs --aab X.aab --notes N.txt --rollout 0.1 --dry-run   # 何をするか表示して edit は捨てる
//   node scripts/store/play-release.mjs --status                                            # 製品版トラックの現状
//   node scripts/store/play-release.mjs --rollout 0.5 --version-code 60                     # 段階公開の拡大(AAB 無し)。1.0 で完全公開
//
// 認証は play-api.mjs(eas.json のサービスアカウント。製品版リリースの権限が要る)。
// 手順: edit → bundles.upload(AAB)→ tracks.update(production, inProgress + userFraction / completed)→ commit。
// リリースノートは ja-JP。Play の審査(アプリ更新)に自動で送られる。
import { readFileSync, statSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { api, BASE, UPLOAD } from './play-api.mjs';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : dflt; };
const DRY = args.includes('--dry-run');
const STATUS = args.includes('--status');
const AAB = opt('--aab', null);
const NOTES = opt('--notes', null);
const TRACK = opt('--track', 'production');
const ROLLOUT = Number(opt('--rollout', '0.1'));
let versionCode = opt('--version-code', null);
if (!(ROLLOUT > 0 && ROLLOUT <= 1)) throw new Error('--rollout は 0 より大きく 1 以下');

let committed = false;
const edit = await api('POST', `${BASE}/edits`, {});
const E = `${BASE}/edits/${edit.id}`;
try {
  const track = await api('GET', `${E}/tracks/${TRACK}`).catch(() => ({ releases: [] }));
  for (const r of track.releases ?? []) {
    console.log(`${TRACK}: ${r.name ?? ''} vc=${(r.versionCodes ?? []).join(',')} ${r.status}${r.userFraction ? ` ${Math.round(r.userFraction * 100)}%` : ''}`);
  }
  if (STATUS) {
    console.log('status: ここまで');
  } else {
    const notes = NOTES ? readFileSync(resolve(NOTES), 'utf8').trim() : null;
    if (AAB) {
      const file = resolve(AAB);
      if (!existsSync(file)) throw new Error(`AAB が無い: ${file}`);
      console.log(`upload ${file} (${(statSync(file).size / 1024 / 1024).toFixed(1)} MB)`);
      if (!DRY) {
        const bundle = await api('POST', `${UPLOAD}/edits/${edit.id}/bundles?uploadType=media`, readFileSync(file), 'application/octet-stream');
        versionCode = String(bundle.versionCode);
        console.log(`uploaded: versionCode ${versionCode}`);
      } else {
        versionCode = versionCode ?? '(AAB の versionCode)';
      }
    }
    if (!versionCode) throw new Error('--aab か --version-code のどちらかが要る');
    const release = {
      versionCodes: [versionCode],
      status: ROLLOUT < 1 ? 'inProgress' : 'completed',
      ...(ROLLOUT < 1 ? { userFraction: ROLLOUT } : {}),
      ...(notes ? { releaseNotes: [{ language: 'ja-JP', text: notes }] } : {}),
    };
    console.log(`release: ${JSON.stringify({ ...release, releaseNotes: notes ? `${notes.split('\n')[0]}…` : undefined })}`);
    if (DRY) {
      console.log('dry-run: ここまで。edit は破棄します');
    } else {
      await api('PUT', `${E}/tracks/${TRACK}`, { track: TRACK, releases: [release] });
      await api('POST', `${E}:commit`, {});
      committed = true;
      console.log(`committed: ${TRACK} に ${release.status}${release.userFraction ? ` ${Math.round(release.userFraction * 100)}%` : ''} で公開(Play の審査後に配信)`);
    }
  }
} finally {
  if (!committed) await api('DELETE', E).catch(() => {});
}
