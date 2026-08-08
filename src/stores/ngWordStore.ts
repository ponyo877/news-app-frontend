import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { logEvent } from '@/lib/analytics';
import { zustandStorage } from '@/stores/mmkv';

// NGワード(タイトルフィルタ)。競合まとめアプリの主力機能。
// persistは更新のたびに全書きするため上限を設ける(articleStatusStoreのHISTORY_LIMITと同思想)
export const MAX_NG_WORDS = 50;
export const MAX_NG_WORD_LENGTH = 20;

interface NgWordState {
  ngWords: string[];
  addWord: (word: string) => void;
  removeWord: (word: string) => void;
}

export const useNgWordStore = create<NgWordState>()(
  persist(
    (set) => ({
      ngWords: [],
      addWord: (word) =>
        set((s) => {
          const trimmed = word.trim().slice(0, MAX_NG_WORD_LENGTH);
          if (trimmed === '' || s.ngWords.includes(trimmed) || s.ngWords.length >= MAX_NG_WORDS) {
            return s;
          }
          logEvent('ng_word', { action: 'add' });
          return { ngWords: [...s.ngWords, trimmed] };
        }),
      removeWord: (word) =>
        set((s) => ({ ngWords: s.ngWords.filter((registered) => registered !== word) })),
    }),
    { name: 'ng-word', storage: createJSONStorage(() => zustandStorage) },
  ),
);
