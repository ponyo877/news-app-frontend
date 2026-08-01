import { applySiteRules } from '@/scraper/applyRules';
import { detectEngine } from '@/scraper/engines';
import { fetchHtml } from '@/scraper/fetchHtml';
import { loadDoc } from '@/scraper/htmlLoad';
import { NOT_FOUND_HTML } from '@/scraper/notFound';
import { matchSiteRule } from '@/scraper/ruleMatcher';
import { getActiveRuleSet } from '@/scraper/rulesStore';
import { serialize, stripLinkHrefs } from '@/scraper/serialize';

// 記事URLを取得し、記事本体以外(サイドバー・コメント欄・広告等)を除去した
// 表示用HTMLを返す唯一の公開API。
// 処理は2層: エンジン(テンプレート種別ごとの構造再構築)+サイト別ルール(個別の除去)。
// WebViewには source={{ html, baseUrl: 記事URL }} で渡す(CSS相対パス解決のため)
export async function scrapeArticle(url: string, siteTitle: string): Promise<string> {
  const page = await fetchHtml(url);
  if (!page.ok) {
    return NOT_FOUND_HTML;
  }

  const $ = loadDoc(page.html);
  // ルールを先に特定する(汎用エンジンがengine設定を参照するため)
  const rule = matchSiteRule(getActiveRuleSet(), url, siteTitle);
  const engine = detectEngine($, rule);
  if (!engine) {
    // 対応エンジンのない構造は整形せずそのまま表示する(旧版はここでクラッシュしていた)
    return page.html;
  }

  await engine.prepare($, async (pageUrl) => (await fetchHtml(pageUrl)).html, rule);

  if (rule) {
    applySiteRules($, rule);
  }
  stripLinkHrefs($);
  return serialize($);
}
