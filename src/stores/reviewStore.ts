import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/stores/mmkv';

// ストアレビュー依頼の状態(判定ロジックは src/lib/review.ts)。
// installAt は初回起動時刻(1.48更新ユーザーは更新後初起動が起点=そこから3日待つ。意図どおり)
export interface ReviewState {
  installAt: number | null;
  // 利用した日('YYYY-MM-DD')。定着の目安。直近ぶんだけ残す
  activeDays: string[];
  // OS に依頼した(iOS はカードを出した)時刻。直近1年ぶんだけ残す
  promptedAt: number[];
  // iOS で「評価する」を押した時刻。以後は依頼しない(Android は押下を知れないので promptedAt だけ)
  ratedAt: number | null;
  // 「表示の不具合を報告」など、不満のサイン。しばらく依頼しない
  lastNegativeAt: number | null;
  ensureInstallAt: () => void;
  noteActiveDay: (day: string) => void;
  notePrompted: (at: number) => void;
  markRated: (at: number) => void;
  noteNegative: (at: number) => void;
}

const ACTIVE_DAYS_LIMIT = 60;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// v1(1.48〜1.53): { installAt, requestedAt }。requestedAt は「1回だけ依頼した」印だったが、
// OS が実際に出したかは分からないので、v2 では「前回依頼時刻」として引き継ぎ 90 日後に再依頼できるようにする
export function migrateReviewState(persisted: unknown, version: number): Partial<ReviewState> {
  if (version >= 2) {
    return persisted as Partial<ReviewState>;
  }
  const state = (persisted ?? {}) as Record<string, unknown>;
  const requestedAt = typeof state.requestedAt === 'number' ? state.requestedAt : null;
  return {
    installAt: typeof state.installAt === 'number' ? state.installAt : null,
    activeDays: [],
    promptedAt: requestedAt === null ? [] : [requestedAt],
    ratedAt: null,
    lastNegativeAt: null,
  };
}

export const useReviewStore = create<ReviewState>()(
  persist(
    (set) => ({
      installAt: null,
      activeDays: [],
      promptedAt: [],
      ratedAt: null,
      lastNegativeAt: null,
      ensureInstallAt: () =>
        set((s) => (s.installAt === null ? { installAt: Date.now() } : s)),
      noteActiveDay: (day) =>
        set((s) =>
          s.activeDays.includes(day)
            ? s
            : { activeDays: [...s.activeDays, day].slice(-ACTIVE_DAYS_LIMIT) },
        ),
      notePrompted: (at) =>
        set((s) => ({ promptedAt: [...s.promptedAt.filter((t) => at - t < YEAR_MS), at] })),
      markRated: (at) => set({ ratedAt: at }),
      noteNegative: (at) => set({ lastNegativeAt: at }),
    }),
    {
      name: 'review',
      version: 2,
      migrate: migrateReviewState,
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
