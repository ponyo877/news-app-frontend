import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

/** アプリと同一の TTF(scripts/sync-assets.sh で public/fonts/ に同期)。 */
const FONTS = [
  ['MPLUSRounded1c', 'MPLUSRounded1c_500Medium.ttf', '500'],
  ['MPLUSRounded1c', 'MPLUSRounded1c_700Bold.ttf', '700'],
  ['MPLUSRounded1c', 'MPLUSRounded1c_900Black.ttf', '900'],
] as const;

export const fontsReady: Promise<void[]> = Promise.all(
  FONTS.map(([family, file, weight]) => loadFont({ family, url: staticFile(`fonts/${file}`), weight, format: 'truetype' })),
);
