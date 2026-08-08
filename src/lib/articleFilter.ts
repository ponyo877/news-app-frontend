// 記事リストの表示フィルタ(サイトブロック + NGワード)の純関数。
// hook側(useVisibleArticles)から分離してテスト可能に保つ

// NFKC正規化+小文字化で全角/半角・大文字/小文字の表記揺れを吸収する
export function normalizeForMatch(text: string): string {
  return text.normalize('NFKC').toLowerCase();
}

export function filterArticles<T extends { titles: string; siteID: string }>(
  articles: readonly T[],
  blockedSiteIds: readonly string[],
  ngWords: readonly string[],
): T[] {
  if (blockedSiteIds.length === 0 && ngWords.length === 0) {
    return [...articles];
  }
  const blocked = new Set(blockedSiteIds);
  const normalizedWords = ngWords.map(normalizeForMatch).filter((w) => w !== '');
  return articles.filter((article) => {
    if (blocked.has(article.siteID)) {
      return false;
    }
    if (normalizedWords.length === 0) {
      return true;
    }
    const title = normalizeForMatch(article.titles);
    return !normalizedWords.some((word) => title.includes(word));
  });
}
