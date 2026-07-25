import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

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
      // 既読化+履歴追加(旧版と同じく重複排除なし・上限なし)
      markRead: (article) =>
        set((s) => ({
          readIds: { ...s.readIds, [article.id]: true },
          history: [...s.history, { ...article, viewedAt: Date.now() }],
        })),
      toggleFavorite: (article) =>
        set((s) => {
          const favorites = { ...s.favorites };
          if (favorites[article.id]) {
            delete favorites[article.id];
          } else {
            favorites[article.id] = article;
          }
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
