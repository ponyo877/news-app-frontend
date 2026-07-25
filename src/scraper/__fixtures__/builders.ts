// livedoor Blog共通構造を再現したテスト用HTMLビルダー
interface FixtureOptions {
  bodyContent: string;
  pageCurrent?: string; // 例: '1/3'
  nextHref?: string;
  extraBodyJunk?: string;
}

export function buildLivedoorHtml({
  bodyContent,
  pageCurrent,
  nextHref,
  extraBodyJunk = '<div class="sidebar">sidebar junk</div>',
}: FixtureOptions): string {
  const paging =
    pageCurrent && nextHref
      ? `<p class="page-current">${pageCurrent}</p><p class="next"><a href="${nextHref}">next</a></p>`
      : '';
  return `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/css/site.css">
  <style>.a{color:red}</style>
  <meta name="viewport" content="width=device-width">
  <script src="/js/ads.js"></script>
  <meta name="description" content="junk">
</head>
<body>
  <div class="container">
    <div class="container-inner">
      <div class="content">
        <header class="section-box"><h1>ブログタイトル</h1></header>
        <header class="section-box"><h2>記事タイトル</h2></header>
        <div class="article-body-outer">
          <div id="article-contents" class="article-body">${bodyContent}${paging}</div>
        </div>
        <div class="ad-block">ad junk</div>
      </div>
      ${extraBodyJunk}
    </div>
  </div>
</body>
</html>`;
}

export function pageBodyHtml(content: string): string {
  return `<html><head></head><body><div class="article-body-outer"><div id="article-contents" class="article-body">${content}</div></div></body></html>`;
}
