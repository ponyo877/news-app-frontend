import type { CheerioAPI } from 'cheerio/slim';

// 記事本文の埋め込みコンテンツ(Xポスト・imgur・Instagram・YouTube)を生かすための定義。
//
// 1.51(1177e06)で本文の<script>を一律除去したところ、Xポスト・imgur・Instagramは
// JSで描画するため、記事の約23%(2026-08-25、本番の670記事で実測: X 11%・imgur 10%・
// YouTube 2%)で画像やポストの場所が空白・灰色バーになった。
// サイト側のJS(広告・計測・アンテナ・Cookie同意)は引き続き全て落とし、
// 埋め込みの描画だけを担う公式スクリプトを、埋め込みがある場合に限ってアプリ側から足す。
// サイト由来のscriptを許可リストで残す方式にしないのは、
//   - widgets.js等を本文の外(フッタ)に置くサイトでは本文だけ残しても描画されない
//   - 同じスクリプトが本文中に何本も並ぶ(ツイートごとに1本)
// ためで、「必要なら1本足す」方が決定的で単純になる

interface EmbedLoader {
  // 本文中の埋め込みの目印
  selector: string;
  // その埋め込みを描画する公式スクリプト
  src: string;
}

const EMBED_LOADERS: EmbedLoader[] = [
  { selector: 'blockquote.twitter-tweet', src: 'https://platform.twitter.com/widgets.js' },
  { selector: 'blockquote.imgur-embed-pub', src: 'https://s.imgur.com/min/embed.js' },
  { selector: 'blockquote.instagram-media', src: 'https://www.instagram.com/embed.js' },
];

// Xポストの埋め込み。widgets.jsはこの中の a[href](ツイートURL)からIDを読むため、
// hrefを剥ぐと描画されない(空のblockquoteだけが残る)。serialize.stripLinkHrefsが参照する
export const TWEET_EMBED_SELECTOR = 'blockquote.twitter-tweet';

// 埋め込みがiframeとして読み込むホスト(サブドメインを含む末尾一致)。
// iOSのWKWebViewはiframeの読み込みでもonShouldStartLoadWithRequestを呼ぶため、
// ArticleScreen側でこのホストだけを通す(それ以外のiframe=広告等は引き続き遮断)
const EMBED_FRAME_HOSTS = [
  'youtube.com',
  'youtube-nocookie.com',
  'youtu.be',
  'twitter.com',
  'x.com',
  'twimg.com',
  'imgur.com',
  'instagram.com',
];

// 本文中の埋め込みに対応する描画スクリプトをbody末尾に足す(種類ごとに1本)。
// script除去(applyCommonRules)の後に呼ぶこと
export function appendEmbedScripts($: CheerioAPI): void {
  const body = $('body');
  for (const loader of EMBED_LOADERS) {
    if (body.find(loader.selector).length === 0) {
      continue;
    }
    body.append(`<script async src="${loader.src}" charset="utf-8"></script>`);
  }
}

// URLのホスト名。React NativeのURLはhostname未実装の版があるため正規表現で取る
function hostOf(url: string): string | undefined {
  return /^https?:\/\/([^/?#:]+)/i.exec(url)?.[1]?.toLowerCase();
}

// サブフレーム(iframe)としての読み込みを許可するURLか
export function isEmbedFrameUrl(url: string): boolean {
  // widgets.js等は空のiframe(about:blank)を作ってから中身を書き込む
  if (url.startsWith('about:')) {
    return true;
  }
  const host = hostOf(url);
  if (!host) {
    return false;
  }
  return EMBED_FRAME_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}
