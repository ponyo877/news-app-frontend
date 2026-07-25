import { load, type CheerioAPI, type CheerioOptions } from 'cheerio/slim';

export const ARTICLE_BODY_SELECTOR = 'div#article-contents.article-body';

// 日本語をHTMLエンティティ化させない(WebView表示・デバッグ性のため)。
// xmlMode:false でHTMLセマンティクスを維持しつつhtmlparser2のシリアライズ設定を渡す
export const LOAD_OPTIONS: CheerioOptions = { xml: { encodeEntities: false, xmlMode: false } };

export type FetchPage = (url: string) => Promise<string>;

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
    const $page = load(html, LOAD_OPTIONS);
    const body = $page(ARTICLE_BODY_SELECTOR).first();
    return body.length > 0 ? $page.html(body) : null;
  } catch {
    return null;
  }
}
