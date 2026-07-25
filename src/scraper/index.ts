import { load } from 'cheerio/slim';

import { applySiteRules } from '@/scraper/applyRules';
import { fetchHtml } from '@/scraper/fetchHtml';
import { NOT_FOUND_HTML } from '@/scraper/notFound';
import { ARTICLE_BODY_SELECTOR, LOAD_OPTIONS, collectArticleBodies } from '@/scraper/pagination';
import { rebuildBody, rebuildHead, serialize, stripLinkHrefs } from '@/scraper/rebuild';

// 記事URLを取得し、広告・不要要素を除去した表示用HTMLを返す唯一の公開API。
// WebViewには source={{ html, baseUrl: 記事URL }} で渡す(CSS相対パス解決のため)
export async function scrapeArticle(url: string, siteTitle: string): Promise<string> {
  const page = await fetchHtml(url);
  if (!page.ok) {
    return NOT_FOUND_HTML;
  }

  const $ = load(page.html, LOAD_OPTIONS);
  if ($(ARTICLE_BODY_SELECTOR).length === 0) {
    // livedoor構造でないページは整形せずそのまま表示する(旧版はここでクラッシュしていた)
    return page.html;
  }

  rebuildHead($);
  await collectArticleBodies($, async (pageUrl) => (await fetchHtml(pageUrl)).html);
  rebuildBody($);
  applySiteRules($, siteTitle);
  stripLinkHrefs($);
  return serialize($);
}
