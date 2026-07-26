import type { CheerioAPI } from 'cheerio/slim';

import { loadDoc } from '@/scraper/htmlLoad';
import type { BlogEngine, FetchPage } from '@/scraper/engines/types';

// livedoor Blog系エンジン。対応6ブログはすべてこの構造
// (div#article-contents.article-body / container > container-inner > content)
export const ARTICLE_BODY_SELECTOR = 'div#article-contents.article-body';

export const livedoorEngine: BlogEngine = {
  name: 'livedoor',
  matches: ($) => $(ARTICLE_BODY_SELECTOR).length > 0,
  prepare: async ($, fetchPage) => {
    rebuildHead($);
    await collectArticleBodies($, fetchPage);
    rebuildBody($);
  },
};

// headをstylesheet・最初のstyle・viewportのみに再構成する(旧arrangeHeader相当)。
// fetchHtmlは元サイトの文字コードによらずUTF-8文字列を返すため、
// charsetを明示注入して表示側の誤推定(EUC-JP/Shift_JISサイトでの文字化け)を防ぐ
export function rebuildHead($: CheerioAPI): void {
  const stylesheets = $('head link[rel="stylesheet"]').toArray();
  const style = $('head style').first().toArray();
  const viewport = $('head meta[name="viewport"]').toArray();
  const head = $('head');
  head.empty();
  head.append('<meta charset="utf-8">');
  head.append([...stylesheets, ...style, ...viewport]);
}

// bodyを「ブログタイトル+記事タイトル+本文」だけの階層に再構成する(旧arrangeBody相当)。
// 記事本体以外(サイドバー・コメント欄・記事外広告)はここで一括除去される
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

// 複数ページ記事(p.next / p.page-currentあり)の本文を結合して
// div.article-body-outer 配下にまとめる(旧arrangeArticleBody相当)
export async function collectArticleBodies($: CheerioAPI, fetchPage: FetchPage): Promise<void> {
  const outer = $('div.article-body-outer').first();
  const firstBody = $(ARTICLE_BODY_SELECTOR).first();
  outer.empty();
  outer.append(firstBody);

  const pageCount = detectPageCount($);
  const nextUrl = $('p.next a').first().attr('href');
  if (pageCount < 2 || !nextUrl) {
    return;
  }

  const pageNumbers = Array.from({ length: pageCount - 1 }, (_, i) => i + 2);
  const bodies = await Promise.all(
    pageNumbers.map((page) => fetchPageBody(fetchPage, nextUrl, page)),
  );
  for (const body of bodies) {
    if (body) {
      outer.append(body);
    }
  }
}

// 「1/3」形式のp.page-currentから総ページ数を得る
function detectPageCount($: CheerioAPI): number {
  if ($('p.next').length === 0) {
    return 1;
  }
  const label = $('p.page-current').first().text();
  const last = label.split('/').at(-1);
  const count = Number(last);
  return Number.isInteger(count) ? count : 1;
}

// 旧版はページ取得失敗で記事全体がエラーになっていたが、失敗ページのみスキップする
async function fetchPageBody(
  fetchPage: FetchPage,
  nextUrl: string,
  page: number,
): Promise<string | null> {
  try {
    const html = await fetchPage(nextUrl.replace('p=2', `p=${page}`));
    const $page = loadDoc(html);
    const body = $page(ARTICLE_BODY_SELECTOR).first();
    return body.length > 0 ? $page.html(body) : null;
  } catch {
    return null;
  }
}
