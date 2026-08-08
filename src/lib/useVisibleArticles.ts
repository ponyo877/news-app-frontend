import { useMemo } from 'react';

import { filterArticles } from '@/lib/articleFilter';
import { useNgWordStore } from '@/stores/ngWordStore';
import { useSiteFilterStore } from '@/stores/siteFilterStore';

// サイトブロック+NGワードの共通フィルタ。
// 新着はサーバのskipIDsでもブロックされるが(二重で無害)、ランキング・検索・
// 関連記事はサーバフィルタが無いため、全リストがこのhookを通ることで
// 「どのタブでもブロック/NGが即時反映される」を保証する
export function useVisibleArticles<T extends { titles: string; siteID: string }>(
  articles: readonly T[],
): T[] {
  const blockedSiteIds = useSiteFilterStore((s) => s.blockedSiteIds);
  const ngWords = useNgWordStore((s) => s.ngWords);
  return useMemo(
    () => filterArticles(articles, blockedSiteIds, ngWords),
    [articles, blockedSiteIds, ngWords],
  );
}
