import type { CheerioAPI } from 'cheerio/slim';

// 全リンクからhrefを剥奪して外部遷移を封じる(全エンジン共通、旧実装と同一)
export function stripLinkHrefs($: CheerioAPI): void {
  $('body a[target]').removeAttr('href');
}

// 本文の最終行が広告ブロックの区切り線に張り付くと窮屈で読みにくいため、
// 末尾に余白を確保する。操作ボタンはヘッダーに移したので大きな逃げは不要
// (ボタンが最下部に浮いていた頃は90pxを確保していた)。
const BOTTOM_CLEARANCE_PX = 24;

// WebViewの端末幅に合わせるviewportが無いサイト向けの保険も兼ねて、
// 末尾余白のみをアプリ側から注入する(取得元のCSSは書き換えない)
const APP_STYLE = `<style>body{padding-bottom:${BOTTOM_CLEARANCE_PX}px;}</style>`;

// 旧版はhead.outerHtml + body.outerHtmlを出力していたため同形式にする。
// アプリ側の余白スタイルは、取得元のCSSに上書きされないようhead末尾に足す
export function serialize($: CheerioAPI): string {
  $('head').append(APP_STYLE);
  return $('head').toString() + $('body').toString();
}
