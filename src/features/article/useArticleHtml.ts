import { useQuery } from '@tanstack/react-query';

import { scrapeArticle } from '@/scraper';

// 記事HTMLの取得+整形(スクレイパー呼び出し)。URL単位でキャッシュ
export function useArticleHtml(url: string, sitetitle: string) {
  return useQuery({
    queryKey: ['articleHtml', url],
    queryFn: () => scrapeArticle(url, sitetitle),
    staleTime: Infinity,
    retry: 1,
  });
}
