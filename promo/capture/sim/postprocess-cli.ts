/**
 * 録画済みテイクの後処理だけをやり直す(MIN_DELTA / lagMs を調整したあと等)。
 *   npm run postprocess -- --take m1 [--debug]
 */
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { postprocessSim } from './postprocess';

const PROMO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const i = process.argv.indexOf('--take');
const take = i >= 0 ? process.argv[i + 1] : undefined;
if (!take) {
  console.error('usage: npm run postprocess -- --take <take> [--debug]');
  process.exit(1);
}
postprocessSim(join(PROMO_ROOT, 'captures', take), join(PROMO_ROOT, 'public', 'captures', take), { debug: process.argv.includes('--debug') });
