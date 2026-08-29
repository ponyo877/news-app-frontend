/**
 * ブランドの色(store-assets のスクリーンショット v2 と同じ値。scripts/store/template/slide.html)と
 * アプリの色(src/theme/colors.ts)を転記する。Remotion 側から ../src を import しない。
 */
export const C = {
  // ストア素材の背景グラデ
  peach: '#FCC3A8',
  coral: '#F9A67C',
  orange: '#F5824E',
  // ストア素材の見出し/サブ
  head: '#3B2016',
  sub: '#7A4A2E',
  // アプリ
  background: '#303030',
  appBar: '#212121',
  surface: '#424242',
  amber: '#FFC107',
  blueGrey: '#607D8B',
  white: '#FFFFFF',
  bezel: '#0B0B0C',
} as const;

export const GRADIENT = 'linear-gradient(180deg, #FCC3A8 0%, #F9A67C 55%, #F5824E 100%)';

/** lib/fonts.ts で登録する family 名(アプリ本文と同じ M PLUS Rounded 1c)。 */
export const FONT = {
  rounded: "'MPLUSRounded1c', 'Hiragino Maru Gothic ProN', 'Hiragino Sans', sans-serif",
} as const;

/** 1080×1920 での TikTok / Reels の UI に隠れない安全域。 */
export const SAFE = { top: 220, bottom: 320, side: 80 } as const;

/** スタンプイン(scale 0.7→1)のスプリング。 */
export const STAMP_SPRING = { damping: 14, stiffness: 180, mass: 0.9 } as const;
