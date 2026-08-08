import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/stores/mmkv';

// ストアレビュー依頼の状態。
// installAt は初回起動時刻(1.48更新ユーザーは更新後初起動が起点=そこから3日待つ。意図どおり)
interface ReviewState {
  installAt: number | null;
  requestedAt: number | null;
  ensureInstallAt: () => void;
  markRequested: () => void;
}

export const useReviewStore = create<ReviewState>()(
  persist(
    (set) => ({
      installAt: null,
      requestedAt: null,
      ensureInstallAt: () =>
        set((s) => (s.installAt === null ? { installAt: Date.now() } : s)),
      markRequested: () => set({ requestedAt: Date.now() }),
    }),
    { name: 'review', storage: createJSONStorage(() => zustandStorage) },
  ),
);
