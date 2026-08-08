// iOS(WKWebView)用の文字サイズ適用スクリプト。
// documentElement.style.fontSize単独ではpx指定フォントのサイトに効かないため
// -webkit-text-size-adjust を使う(px含め全テキストが拡縮される標準手法)。
// injectJavaScriptの評価結果に使うため末尾true必須(RN WebViewの作法)
export function fontScaleScript(percent: number): string {
  return `document.documentElement.style.webkitTextSizeAdjust='${percent}%';true;`;
}
