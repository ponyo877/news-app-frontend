// 新着フィードのサイト別バランシング。
// 上位3サイトで48%を占める偏り(GROWTH-PLAN §0)を、ページ内の並べ替えだけで緩和する。
//
// カーソルページングのため記事を「捨てる」ことはできない(捨てた記事は二度と出ない)。
// 超過分はページ末尾へ送る = 入力と出力は同一の記事集合を保証する

interface SiteBalanceOptions {
  // 1ページ(15件)内の同一サイト上限
  maxPerPage?: number;
  // 同一サイトの連続表示上限
  maxRun?: number;
}

export function balanceSitePage<T extends { siteID: string }>(
  page: readonly T[],
  { maxPerPage = 5, maxRun = 2 }: SiteBalanceOptions = {},
): T[] {
  const result: T[] = [];
  const deferred: T[] = [];
  const countBySite = new Map<string, number>();

  for (const article of page) {
    const count = countBySite.get(article.siteID) ?? 0;
    const lastRunSame =
      result.length >= maxRun &&
      result.slice(-maxRun).every((placed) => placed.siteID === article.siteID);
    if (count >= maxPerPage || lastRunSame) {
      deferred.push(article);
      continue;
    }
    result.push(article);
    countBySite.set(article.siteID, count + 1);
  }
  return [...result, ...deferred];
}
