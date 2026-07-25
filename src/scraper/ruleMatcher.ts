import type { ScraperRuleSet, SiteRule } from '@/scraper/types';

// 記事URLからルールを特定する。
// 第一キー: URLのスキームを除いた前方一致(テンプレート=ドメインに紐づくため最も安定)。
// blog.livedoor.jp のような共有ホストはパスプレフィックスで区別される。
// フォールバック: 旧版互換のsitetitle一致(URLが想定外の形式だった場合の保険)
export function matchSiteRule(
  ruleSet: ScraperRuleSet,
  articleUrl: string,
  siteTitle: string,
): SiteRule | undefined {
  const normalized = stripScheme(articleUrl);
  const byUrl = ruleSet.rules.find((rule) =>
    rule.urlPrefixes.some((prefix) => normalized.startsWith(stripScheme(prefix))),
  );
  if (byUrl) {
    return byUrl;
  }
  return ruleSet.rules.find((rule) => rule.siteTitles?.includes(siteTitle));
}

function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '');
}
