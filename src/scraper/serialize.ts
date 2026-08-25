import type { CheerioAPI } from 'cheerio/slim';

import { TWEET_EMBED_SELECTOR } from '@/scraper/embeds';

// 出典リンクのタップをWebView側で判別するための番兵URL。
// .invalid は絶対に解決されない予約TLD(RFC 6761)なので、実際に読み込まれることはない。
// ArticleScreenのonShouldStartLoadWithRequestがこれを捕まえて外部ブラウザへ渡す
// (navigationTypeはiOS限定のため、URLで判別する)
export const SOURCE_LINK_URL = 'https://matomekun.invalid/source';

const INERT_LINK_CLASS = 'app-inert';

// アプリが後付けする出典ブロック。本文ではないので読み上げ対象からも外す
// (ttsScriptが参照する)
export const SOURCE_BLOCK_CLASS = 'app-source';

export interface ArticleSource {
  url: string;
  siteName: string;
}

// 全リンクからhrefを剥奪して外部遷移を封じる(全エンジン共通)。
//
// 【AdMobポリシー対応】hrefを剥ぐだけでは青字・下線のまま残り、
// 「押せそうに見えて何も起きない要素」になる。これは
// 「サイトの動作: ナビゲーション」の *存在しないコンテンツにリンクしている*
// に該当するため、見た目もリンクでなくす。
// 旧実装は a[target] のみを対象にしていたので、target のないアンカー
// (安価・サイト内リンク)はhrefが残ったままWebView側で遮断されていた。
//
// 例外: Xポスト埋め込み内のアンカー。widgets.jsがこのhref(ツイートURL)からIDを読むため、
// 剥ぐと描画されず空のblockquoteだけが残る(1.51で発生)。描画後はiframeに置き換わるので
// 押せないリンクとしては残らず、描画失敗時(オフライン等)もapp-inertで見た目と操作を殺す
export function stripLinkHrefs($: CheerioAPI): void {
  $('body a').not(`${TWEET_EMBED_SELECTOR} a`).removeAttr('href');
  $('body a').addClass(INERT_LINK_CLASS);
}

// 本文の最終行が広告ブロックの区切り線に張り付くと窮屈で読みにくいため、
// 末尾に余白を確保する。操作ボタンはヘッダーに移したので大きな逃げは不要
// (ボタンが最下部に浮いていた頃は90pxを確保していた)。
const BOTTOM_CLEARANCE_PX = 24;

// WebViewの端末幅に合わせるviewportが無いサイト向けの保険も兼ねて、
// 末尾余白のみをアプリ側から注入する(取得元のCSSは書き換えない)。
// 無効化したリンクと出典表示のスタイルは、取得元CSSの詳細度に負けないよう!important。
// 色は明背景・暗背景のどちらのサイトでも読めるものを選ぶ
const APP_STYLE = [
  '<style>',
  `body{padding-bottom:${BOTTOM_CLEARANCE_PX}px;}`,
  `a.${INERT_LINK_CLASS}{color:inherit!important;text-decoration:none!important;`,
  'cursor:default!important;pointer-events:none!important;}',
  `.${SOURCE_BLOCK_CLASS}{margin:24px 12px 0;padding:10px 0 0;`,
  'border-top:1px solid rgba(128,128,128,.35);font-size:12px;line-height:1.8;}',
  // 出典の地の文がサイトCSSでリンク色になると、押せない文字がリンクに見える
  `.${SOURCE_BLOCK_CLASS},.${SOURCE_BLOCK_CLASS} div`,
  '{color:#888!important;text-decoration:none!important;}',
  `.${SOURCE_BLOCK_CLASS} a{color:#3b8fd4!important;text-decoration:underline!important;}`,
  '</style>',
].join('');

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 出典表示と元記事への導線。
// 本文中のリンクをすべて無効化している以上、実際に開ける正しいリンクを
// 1つは用意しておく必要がある(帰属の明示も兼ねる)。
// stripLinkHrefsの後に呼ばれる前提なので、このhrefは剥奪されない
function appendSourceCredit($: CheerioAPI, source: ArticleSource): void {
  $('body').append(
    `<footer class="${SOURCE_BLOCK_CLASS}">` +
      `<div>出典: ${escapeAttr(source.siteName)}</div>` +
      `<div><a href="${SOURCE_LINK_URL}">元記事を開く</a></div>` +
      '</footer>',
  );
}

// 旧版はhead.outerHtml + body.outerHtmlを出力していたため同形式にする。
// アプリ側の余白スタイルは、取得元のCSSに上書きされないようhead末尾に足す
export function serialize($: CheerioAPI, source: ArticleSource): string {
  $('head').append(APP_STYLE);
  appendSourceCredit($, source);
  return $('head').toString() + $('body').toString();
}
