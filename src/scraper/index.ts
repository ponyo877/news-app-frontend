import { applyCommonRules, applySiteRules } from '@/scraper/applyRules';
import { detectEngine } from '@/scraper/engines';
import { ArticleUnavailableError } from '@/scraper/errors';
import { fetchHtml } from '@/scraper/fetchHtml';
import { loadDoc } from '@/scraper/htmlLoad';
import { matchSiteRule } from '@/scraper/ruleMatcher';
import { getActiveRuleSet } from '@/scraper/rulesStore';
import { serialize, stripLinkHrefs } from '@/scraper/serialize';
import { logEvent } from '@/lib/analytics';

// 記事URLを取得し、記事本体以外(サイドバー・コメント欄・広告等)を除去した
// 表示用HTMLを返す唯一の公開API。
// 処理は2層: エンジン(テンプレート種別ごとの構造再構築)+サイト別ルール(個別の除去)。
// WebViewには source={{ html, baseUrl: 記事URL }} で渡す(CSS相対パス解決のため)
//
// 【AdMobポリシー対応】本文を整形できなかった場合は必ず throw すること。
// 代わりのHTMLを返すと、本文の無い画面がバナー広告つきで表示される(errors.ts参照)
export async function scrapeArticle(url: string, siteTitle: string): Promise<string> {
  const page = await fetchHtml(url);
  if (!page.ok) {
    throw new ArticleUnavailableError('gone');
  }

  const $ = loadDoc(page.html);
  // ルールを先に特定する(汎用エンジンがengine設定を参照するため)
  const rule = matchSiteRule(getActiveRuleSet(), url, siteTitle);
  const engine = detectEngine($, rule);
  if (!engine) {
    // 整形せず取得元HTMLをそのまま出すと、元サイトの広告ごと自社バナーと同居する。
    // サイト改装で静かに起きるため、運用で気づけるようイベントを送る
    logEvent('scrape_engine_miss', { site: siteTitle });
    throw new ArticleUnavailableError('unsupported');
  }

  await engine.prepare($, async (pageUrl) => (await fetchHtml(pageUrl)).html, rule);

  if (rule) {
    applySiteRules($, rule);
  }
  applyCommonRules($);
  // 順序に依存: applySiteRulesのanchorCleanupsはhrefを読んで削除判定するため、
  // 先にhrefを剥ぐと全ルールが空振りする
  stripLinkHrefs($);
  return serialize($, { url, siteName: siteTitle });
}
