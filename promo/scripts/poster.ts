/**
 * テイクのカット割りとポスターフレームを表示する(Remotion を起動せずに確認する用)。
 *   npx tsx scripts/poster.ts --take m1
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBeats } from '../src/lib/beats';
import type { Timeline } from '../src/lib/timeline-core';

const PROMO_ROOT = fileURLToPath(new URL('../', import.meta.url));
const i = process.argv.indexOf('--take');
const take = (i >= 0 && process.argv[i + 1]) || 'm1';
const tl = JSON.parse(readFileSync(join(PROMO_ROOT, 'public', 'captures', take, 'timeline.json'), 'utf8')) as Timeline;

for (const [label, opts] of [
  ['AppStorePreview', { hook: false, endCard: false }],
  ['SocialPromo', { hook: true, endCard: true }],
] as const) {
  const b = buildBeats(tl, opts);
  console.log(`${label}: ${b.total}f = ${(b.total / tl.fps).toFixed(1)}s  poster=${b.posterFrame}`);
  for (const s of b.segments) {
    const parts = (s.parts ?? []).map((p) => `${p.sourceFrame}+${Math.round(p.duration * s.rate)}`).join(' | ');
    console.log(`  ${s.kind.padEnd(8)} from ${String(s.from).padStart(4)} dur ${String(s.duration).padStart(4)} ×${s.rate}  src[${parts}]  caption@${s.caption?.delay ?? '-'}`);
  }
}
