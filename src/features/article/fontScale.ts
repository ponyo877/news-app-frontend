// iOS(WKWebView)用の文字サイズ適用スクリプト。
//
// 当初 -webkit-text-size-adjust を使ったが、スクレイプ済みHTMLに元サイトの
// viewport meta(width=device-width)が残っているため無効化されてしまい
// 「変えても何も起きない」状態だった。CSS zoom はviewportに関係なく
// レイアウト全体を拡縮するためWKWebViewで確実に効く(iOS 15+/WebKitは古くから対応)。
// injectJavaScriptの評価結果に使うため末尾true必須(RN WebViewの作法)
export function fontScaleScript(percent: number): string {
  return `document.documentElement.style.zoom='${percent / 100}';true;`;
}
