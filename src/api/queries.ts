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
  postArticleReport,
  postComment,
  searchArticles,
} from '@/api/endpoints';
import { fetchMatsuri, fetchRelated, recentReadIds } from '@/api/recs';
import { logEvent } from '@/lib/analytics';
import { collectArticleReportContext } from '@/lib/articleReport';
import type { ArticleReportReason } from '@/lib/articleReport';
import { computeDeviceHash } from '@/lib/deviceHash';
import type { ArticleMeta } from '@/stores/articleStatusStore';
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

// アクティブな祭り一覧(新着バッジ・ホームヘッダー🔥・MatsuriScreenで共有)
export function useMatsuri() {
  return useQuery({
    queryKey: ['matsuri'],
    queryFn: fetchMatsuri,
    staleTime: 5 * 60_000,
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

// POST系のエラー種別(コメント投稿・不具合報告で共通)。以前は全部「不適切な表現」と表示していたが、
// backendにNGワード検査は存在せず、実際はネットワーク/サーバ障害が大半だった
export type PostErrorKind = 'network' | 'server' | 'rejected';
export type PostCommentErrorKind = PostErrorKind;

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

// 記事表示の不具合報告(記事画面⋮メニュー)。理由だけを受け取り、記事URL・アプリ内ID・端末情報を添えて送る。
// 同一端末×記事はサーバ側でupsertされるので、2回目も成功として扱ってよい
export function usePostArticleReport(article: ArticleMeta) {
  const devicehash = useUserStore((s) => s.devicehash);
  return useMutation({
    mutationFn: async (reason: ArticleReportReason) => {
      // bootstrap前(devicehash未生成)は計算して補う。'' を送るとbackendが400を返すため
      const hash = devicehash ?? (await computeDeviceHash());
      let result: { ok: boolean; status: number };
      try {
        result = await postArticleReport({
          articleId: article.id,
          url: article.url,
          sitetitle: article.sitetitle,
          devicehash: hash,
          reason,
          ...collectArticleReportContext(),
        });
      } catch {
        throw new Error('network' satisfies PostErrorKind);
      }
      if (!result.ok) {
        throw new Error(classifyPostCommentError(result.status));
      }
    },
    onSuccess: (_, reason) => {
      logEvent('article_report', { site: article.sitetitle, reason });
    },
    // 失敗は端末側でしか見えないので、種別だけ計測に残す(Crashlyticsには送らない)
    onError: (error) => {
      logEvent('article_report_failed', { kind: error.message });
    },
  });
}
