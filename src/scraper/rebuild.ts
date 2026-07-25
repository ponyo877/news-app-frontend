import type { CheerioAPI } from 'cheerio/slim';

// headをstylesheet・最初のstyle・viewportのみに再構成する(旧arrangeHeader相当)
export function rebuildHead($: CheerioAPI): void {
  const stylesheets = $('head link[rel="stylesheet"]').toArray();
  const style = $('head style').first().toArray();
  const viewport = $('head meta[name="viewport"]').toArray();
  const head = $('head');
  head.empty();
  head.append([...stylesheets, ...style, ...viewport]);
}

// bodyを「ブログタイトル+記事タイトル+本文」だけの階層に再構成する(旧arrangeBody相当)。
// livedoor Blog共通のDOM構造(container > container-inner > content)に依存
export function rebuildBody($: CheerioAPI): void {
  const headers = $('header.section-box').toArray();
  const blogTitle = headers[0];
  const articleTitle = headers[1];
  const outer = $('div.article-body-outer').first();

  const content = $('div.content').first();
  content.empty();
  if (blogTitle) {
    content.append(blogTitle);
  }
  if (articleTitle) {
    content.append(articleTitle);
  }
  content.append(outer);

  const inner = $('div.container-inner').first();
  inner.empty();
  inner.append(content);

  const container = $('div.container').first();
  container.empty();
  container.append(inner);

  const body = $('body');
  body.empty();
  body.append(container);
}

// 全リンクからhrefを剥奪して外部遷移を封じる(全サイト共通、旧実装と同一)
export function stripLinkHrefs($: CheerioAPI): void {
  $('body a[target]').removeAttr('href');
}

// 旧版はhead.outerHtml + body.outerHtmlを出力していたため同形式にする
export function serialize($: CheerioAPI): string {
  return $('head').toString() + $('body').toString();
}
