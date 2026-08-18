import { useQuery } from '@tanstack/react-query';

import { scrapeArticle } from '@/scraper';
import { articleUnavailableReason } from '@/scraper/errors';

// 記事HTMLの取得+整形(スクレイパー呼び出し)。URL単位でキャッシュ
export function useArticleHtml(url: string, sitetitle: string) {
  return useQuery({
    queryKey: ['articleHtml', url],
    queryFn: () => scrapeArticle(url, sitetitle),
    staleTime: Infinity,
    // 削除済み・非対応は再取得しても結果が変わらないため、通信エラーのときだけ1回だけ再試行する
    retry: (count, error) => articleUnavailableReason(error) === undefined && count < 1,
  });
}
