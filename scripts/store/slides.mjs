// ストアスクリーンショットの定義。日常的に触るのはこのファイルだけ。
//
// 骨格(全枚共通): 上部に2行の見出し+1行のサブ、その下に黒ベゼルの端末。端末の下端は版面外。
// 構図(3型):  A = 端末正面+拡大チップ / B = ズームイン(端末を版面より広く) / C = 2台並び
//
// 単位:
//   x, y, w …… 版面の幅・高さに対する割合(0〜1)。パノラマ用の scene は x を 0〜3(3枚ぶん)で書く
//   chip.rect … 元スクリーンショットのピクセル矩形 [x, y, w, h](端末ごとに指定)
//   visible …… 端末画面のうち版面に見えている高さの割合。タブバー/広告を隠すため 0.75 以下に保つ
//
// 装飾の置き場は版面の縦横比で変わる:
//   band='tall'(iOS 6.9 / iPad) は見出しと端末の間に帯が空くので、そこに大きめの装飾を置く
//   band='play'(1080×1920) は端末がほぼ全面を占めるので、上部の角に小さく置く
//
// 見出しは 1行 ≤ 8文字・2行。サブは 1行 ≤ 22文字。絵文字は使わない(別フォントが混ざる)。

export const formats = {
  play: { W: 1080, H: 1920, platform: 'android', frame: 'android', band: 'play', headPx: 104, subPx: 48, textTop: 0.055 },
  ios:  { W: 1320, H: 2868, platform: 'ios',     frame: 'iphone',  band: 'tall', headPx: 136, subPx: 60, textTop: 0.06 },
  ipad: { W: 2064, H: 2752, platform: 'ipad',    frame: 'ipad',    band: 'tall', headPx: 154, subPx: 68, textTop: 0.06 },
};

// ベゼル幅(px)は 1080 幅・端末幅 90% 基準。端末幅に比例して伸縮する
export const bezelPx = { android: 26, iphone: 26, ipad: 34 };

// 端末の置き方。x を省略すると中央。visible から上端を逆算する
export const layouts = {
  A: [{ w: 0.90, visible: 0.71 }],
  B: [{ w: 1.10, visible: 0.55 }],
  C: [
    { w: 0.76, x: -0.05, visible: 0.72, z: 1 },
    { w: 0.76, x: 0.29,  visible: 0.62, z: 2 },
  ],
};

// 1〜3枚目の背景に横断して置く装飾(x は 0〜3)。各スライドの panorama 番号ぶん左へずらして描く
export const scene = {
  tall: [
    { src: 'bubble-big',     x: 0.12, y: 0.29, w: 0.28, rotate: -12, z: 'back' },
    { src: 'sound-rings',    x: 0.50, y: 0.60, w: 1.35, opacity: 0.8, z: 'back' },
    { src: 'bubble-cluster', x: 0.94, y: 0.25, w: 0.36, rotate: 6,   z: 'back' },
    { src: 'flame',          x: 1.13, y: 0.31, w: 0.20, rotate: -8,  z: 'front' },
    { src: 'bubble-big',     x: 1.88, y: 0.27, w: 0.24, rotate: 14,  z: 'back' },
    { src: 'flame',          x: 2.09, y: 0.26, w: 0.14, rotate: 10,  z: 'back' },
    { src: 'bubble-cluster', x: 2.92, y: 0.29, w: 0.38, rotate: -6,  z: 'back' },
  ],
  play: [
    { src: 'bubble-big',     x: 0.085, y: 0.075, w: 0.13, rotate: -14, z: 'back' },
    { src: 'sound-rings',    x: 0.50,  y: 0.58,  w: 1.30, opacity: 0.7, z: 'back' },
    { src: 'bubble-cluster', x: 0.905, y: 0.165, w: 0.17, rotate: 8,   z: 'back' },
    { src: 'flame',          x: 1.08,  y: 0.095, w: 0.12, rotate: -8,  z: 'back' },
    { src: 'bubble-big',     x: 1.915, y: 0.155, w: 0.13, rotate: 12,  z: 'back' },
    { src: 'flame',          x: 2.075, y: 0.085, w: 0.11, rotate: 10,  z: 'back' },
    { src: 'bubble-cluster', x: 2.915, y: 0.16,  w: 0.17, rotate: -6,  z: 'back' },
  ],
};

// 拡大チップの矩形は端末ごとの元画像ピクセル。y は元の要素の位置に合わせて自動で置く(dy で微調整)
export const slides = [
  {
    id: 1, layout: 'A', screen: 'tts', panorama: 0,
    head: ['読まずに、', '聴く。'],
    sub: '通勤中も作業中も、耳だけでスレを追える',
    chip: { rect: { android: [0, 330, 600, 130], ios: [0, 380, 600, 120], ipad: [0, 180, 600, 85] },
            scale: 1.5, x: 0.36, dy: -0.01 },
  },
  {
    id: 2, layout: 'A', screen: 'matsuri', panorama: 1,
    head: ['盛り上がってる', 'スレが、わかる。'],
    sub: '複数のサイトが同じ話題を扱うと自動で検知',
    chip: { rect: { android: [0, 348, 900, 72], ios: [0, 378, 920, 92], ipad: [0, 186, 640, 62] },
            scale: 1.5, x: 0.50, dy: -0.01 },
  },
  {
    id: 3, layout: 'B', screen: 'article', panorama: 2,
    head: ['本文だけが、', 'すっと出る。'],
    sub: 'Cookieの確認も、重なってくる表示もなし',
  },
  {
    id: 4, layout: 'C', screens: ['search', 'ranking'],
    head: ['今日いちばん', '読まれたスレ。'],
    sub: '日間・週間・月間のランキングと検索',
    props: { tall: [{ src: 'crown-sparkles', x: 0.84, y: 0.29, w: 0.26, rotate: 8, z: 'front' }],
             play: [{ src: 'crown-sparkles', x: 0.905, y: 0.11, w: 0.17, rotate: 8, z: 'back' }] },
  },
  {
    id: 5, layout: 'A', screen: 'sites',
    head: ['まとめサイトを、', 'ひとつに。'],
    sub: '読みたいサイトだけを選んで表示できる',
    chip: { rect: { android: [20, 470, 1190, 170], ios: [20, 510, 1250, 130], ipad: [20, 360, 1900, 130] },
            scale: { android: 1.25, ios: 1.15, ipad: 1.15 }, x: 0.50, dy: 0 },
    props: { tall: [{ src: 'bubble-cluster', x: 0.12, y: 0.30, w: 0.32, rotate: -10, z: 'back' },
                    { src: 'bubble-big',     x: 0.90, y: 0.25, w: 0.24, rotate: 12,  z: 'back' }],
             play: [{ src: 'bubble-cluster', x: 0.09, y: 0.10, w: 0.16, rotate: -10, z: 'back' },
                    { src: 'bubble-big',     x: 0.915, y: 0.15, w: 0.13, rotate: 12,  z: 'back' }] },
  },
  {
    id: 6, layout: 'A', screen: 'foryou',
    head: ['読むほど、', '好みに寄る。'],
    sub: 'あなた向けのおすすめと、記事ごとの関連',
    chip: { rect: { android: [260, 325, 1020, 150], ios: [280, 372, 1010, 100], ipad: [800, 250, 1264, 110] },
            scale: 1.4, x: 0.58, dy: 0 },
    props: { tall: [{ src: 'sound-rings', x: 0.50, y: 0.60, w: 1.25, opacity: 0.6, z: 'back' },
                    { src: 'bubble-big',  x: 0.10, y: 0.28, w: 0.24, rotate: -14, z: 'back' }],
             play: [{ src: 'bubble-big',  x: 0.085, y: 0.09, w: 0.13, rotate: -14, z: 'back' },
                    { src: 'flame',       x: 0.92,  y: 0.12, w: 0.12, rotate: 10,  z: 'back' }] },
  },
  {
    id: 7, layout: 'C', screens: ['ngwords', 'hide-site'],
    head: ['読みたくない', '話題は、隠す。'],
    sub: 'NGワードとサイト非表示で、一覧を自分好みに',
    props: { tall: [{ src: 'bubble-cluster', x: 0.86, y: 0.27, w: 0.32, rotate: 8, z: 'back' }],
             play: [{ src: 'bubble-cluster', x: 0.905, y: 0.13, w: 0.17, rotate: 8, z: 'back' }] },
  },
];

// iPad は 3 枚(App Store の必須ぶん)
export const ipadSlides = [1, 2, 4];

// Play のフィーチャーグラフィック(1024×500)。文字は左、装飾は右
export const feature = {
  W: 1024, H: 500,
  title: 'まとめくん',
  lines: ['2ch・5chまとめを、読み上げでながら聴き', '話題検知・ランキング・サイト横断'],
  props: [
    { src: 'sound-rings',    x: 0.80, y: 0.52, w: 0.62, opacity: 0.55, z: 'back' },
    { src: 'bubble-cluster', x: 0.80, y: 0.50, w: 0.40, rotate: -4 },
  ],
};
