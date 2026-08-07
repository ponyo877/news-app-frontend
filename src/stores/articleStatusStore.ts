import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import { logEvent } from '@/lib/analytics';
import { zustandStorage } from '@/stores/mmkv';

// 記事のフラグ(既読/お気に入り/履歴)を記事IDで正規化して一元管理する。
// 旧版の「8つのProviderへ手動で同じ更新をブロードキャスト」を根絶するための核。
export interface ArticleMeta {
  id: string;
  titles: string;
  url: string;
  image: string;
  siteID: string;
  sitetitle: string;
  publishedAt: string;
}

export interface HistoryEntry extends ArticleMeta {
  viewedAt: number;
}

// 履歴の保持上限。persistは更新のたびにストア全体をMMKVへ書くため、無制限は書き込み劣化に直結する
const HISTORY_LIMIT = 500;

interface ArticleStatusState {
  readIds: Record<string, true>;
  favorites: Record<string, ArticleMeta>;
  history: HistoryEntry[];
  markRead: (article: ArticleMeta) => void;
  toggleFavorite: (article: ArticleMeta) => void;
}

export const useArticleStatusStore = create<ArticleStatusState>()(
  persist(
    (set) => ({
      readIds: {},
      favorites: {},
      history: [],
      // 既読化+履歴追加。同一記事は最新閲覧のみ残し、全体を上限件数に丸める。
      // (旧版は重複排除も上限もなく、ヘビーユーザーほど配列肥大で遅くなっていた)
      markRead: (article) =>
        set((s) => ({
          readIds: { ...s.readIds, [article.id]: true },
          history: [
            ...s.history.filter((entry) => entry.id !== article.id),
            { ...article, viewedAt: Date.now() },
          ].slice(-HISTORY_LIMIT),
        })),
      toggleFavorite: (article) =>
        set((s) => {
          const favorites = { ...s.favorites };
          if (favorites[article.id]) {
            delete favorites[article.id];
          } else {
            favorites[article.id] = article;
          }
          logEvent('favorite', { added: !s.favorites[article.id], site: article.sitetitle });
          return { favorites };
        }),
    }),
    { name: 'article-status', storage: createJSONStorage(() => zustandStorage) },
  ),
);

// どのリストに同じ記事が出ていても、この1フックで全カードが同期される
export const useArticleFlags = (articleId: string) =>
  useArticleStatusStore(
    useShallow((s) => ({
      readFlg: Boolean(s.readIds[articleId]),
      favoriteFlg: Boolean(s.favorites[articleId]),
    })),
  );
