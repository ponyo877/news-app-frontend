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
  fetchSites,
  postComment,
  searchArticles,
} from '@/api/endpoints';
import { fetchRelated, recentReadIds } from '@/api/recs';
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
  related: (articleId: string) => ['articles', 'related', articleId] as const,
  sites: ['sites'] as const,
  comments: (articleId: string) => ['comments', articleId] as const,
};

// 新着(無限スクロール)。skipIDs(ブロックサイト)はサーバ側で新着のみに効く
// (他タブはuseVisibleArticlesのクライアントフィルタで対応)
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

// 記事画面の⚡関連記事。旧/v1/article/similar(BERT・封印中)の後継として
// Cloudflare推薦基盤の「人×今読んでいる記事」を使う。失敗時は関連なし扱い
export function useRelatedArticles(articleId: string) {
  return useQuery({
    queryKey: queryKeys.related(articleId),
    queryFn: () => fetchRelated(articleId, recentReadIds()),
    retry: 1,
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

// コメント投稿エラーの種別。以前は全部「不適切な表現」と表示していたが、
// backendにNGワード検査は存在せず、実際はネットワーク/サーバ障害が大半だった
export type PostCommentErrorKind = 'network' | 'server' | 'rejected';

export function classifyPostCommentError(status: number): PostCommentErrorKind {
  return status >= 500 ? 'server' : 'rejected';
}

export function usePostComment(articleId: string) {
  const client = useQueryClient();
  const devicehash = useUserStore((s) => s.devicehash);
  return useMutation({
    mutationFn: async (message: string) => {
      let result: { ok: boolean; status: number };
      try {
        result = await postComment(articleId, message, devicehash ?? '');
      } catch {
        // fetch例外 = 通信不可(機内モード・サーバダウン等)
        throw new Error('network' satisfies PostCommentErrorKind);
      }
      if (!result.ok) {
        throw new Error(classifyPostCommentError(result.status));
      }
    },
    onSuccess: () => {
      logEvent('comment_post');
      void client.invalidateQueries({ queryKey: queryKeys.comments(articleId) });
    },
  });
}
