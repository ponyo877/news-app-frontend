import { ApiError } from '@/api/client';
import { Article, articleListSchema } from '@/api/schemas';
import { useArticleStatusStore } from '@/stores/articleStatusStore';

// Cloudflare Workers上の推薦基盤(news-app-infra/workers/recs)。
// 閲覧履歴は端末が毎回送るステートレス設計(サーバはユーザー状態を持たない)。
// 失敗・404時は呼び出し側が端末内リランク(lib/forYou.ts)へ縮退する
const RECS_BASE_URL = 'https://matome-recs.ponyo877.workers.dev';
// 推薦は補助機能なので長く待たない(縮退先がある)
const RECS_TIMEOUT_MS = 5000;

// 直近閲覧の記事ID(新しい順)。ユーザーベクトル合成のシード
export function recentReadIds(limit = 20): string[] {
  const history = useArticleStatusStore.getState().history;
  return history
    .slice(-limit)
    .reverse()
    .map((entry) => entry.id);
}

async function postRecs(path: string, body: unknown): Promise<Article[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RECS_TIMEOUT_MS);
  try {
    const res = await fetch(`${RECS_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new ApiError(res.status, `POST ${path} failed (${res.status})`);
    }
    return articleListSchema.parse(await res.json()).data;
  } finally {
    clearTimeout(timer);
  }
}

// 人単位の推薦(for Youタブ)
export function fetchForYou(recentArticleIds: string[]): Promise<Article[]> {
  return postRecs('/recs/foryou', { recentArticleIds });
}

// 人×今読んでいる記事の推薦(記事画面の⚡関連記事)
export function fetchRelated(articleId: string, recentArticleIds: string[]): Promise<Article[]> {
  return postRecs('/recs/related', { articleId, recentArticleIds });
}
