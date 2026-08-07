import {
  QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  RankingPeriod,
  fetchArticles,
  fetchComments,
  fetchPopular,
  fetchSimilar,
  fetchSites,
  postComment,
  searchArticles,
} from '@/api/endpoints';
import { logEvent } from '@/lib/analytics';
import { useSiteFilterStore } from '@/stores/siteFilterStore';
import { useUserStore } from '@/stores/userStore';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 2 },
  },
});

export const queryKeys = {
  latest: (skipIdsCsv: string) => ['articles', 'latest', skipIdsCsv] as const,
  popular: (period: RankingPeriod) => ['articles', 'popular', period] as const,
  search: (keyword: string) => ['articles', 'search', keyword] as const,
  similar: (articleId: string) => ['articles', 'similar', articleId] as const,
  sites: ['sites'] as const,
  comments: (articleId: string) => ['comments', articleId] as const,
};

// 新着(無限スクロール)。skipIDs(ブロックサイト)は新着のみに効く(旧版と同挙動)
export function useLatestArticles() {
  const blockedSiteIds = useSiteFilterStore((s) => s.blockedSiteIds);
  const skipIdsCsv = blockedSiteIds.join(',');
  return useInfiniteQuery({
    queryKey: queryKeys.latest(skipIdsCsv),
    queryFn: ({ pageParam }) => fetchArticles(pageParam, blockedSiteIds),
    initialPageParam: '',
    getNextPageParam: (lastPage) =>
      lastPage.data.length > 0 && lastPage.lastPublishedAt ? lastPage.lastPublishedAt : undefined,
  });
}

export function usePopularArticles(period: RankingPeriod) {
  return useQuery({
    queryKey: queryKeys.popular(period),
    queryFn: () => fetchPopular(period),
  });
}

export function useSearchArticles(keyword: string) {
  return useQuery({
    queryKey: queryKeys.search(keyword),
    queryFn: () => searchArticles(keyword),
    enabled: keyword !== '',
  });
}

export function useSimilarArticles(articleId: string) {
  return useQuery({
    queryKey: queryKeys.similar(articleId),
    queryFn: () => fetchSimilar(articleId),
  });
}

export function useSites() {
  return useQuery({ queryKey: queryKeys.sites, queryFn: fetchSites });
}

export function useComments(articleId: string) {
  return useQuery({
    queryKey: queryKeys.comments(articleId),
    queryFn: () => fetchComments(articleId),
    staleTime: 0,
  });
}

export function usePostComment(articleId: string) {
  const client = useQueryClient();
  const devicehash = useUserStore((s) => s.devicehash);
  return useMutation({
    mutationFn: async (message: string) => {
      const result = await postComment(articleId, message, devicehash ?? '');
      if (!result.ok) {
        // 旧版のSnackBar文言に対応するエラー種別
        throw new Error('inappropriate');
      }
    },
    onSuccess: () => {
      logEvent('comment_post');
      void client.invalidateQueries({ queryKey: queryKeys.comments(articleId) });
    },
  });
}
