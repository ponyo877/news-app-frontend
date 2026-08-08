import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/stores/mmkv';

// 記事画面の文字サイズ(競合標準機能)。
// 適用はWebView側: Android=textZoom prop / iOS=-webkit-text-size-adjust注入
export const FONT_SCALES = [
  { key: 'S', label: '小', percent: 87 },
  { key: 'M', label: '標準', percent: 100 },
  { key: 'L', label: '大', percent: 115 },
  { key: 'XL', label: '特大', percent: 130 },
] as const;

export type FontScaleKey = (typeof FONT_SCALES)[number]['key'];

export function percentOf(scale: FontScaleKey): number {
  return FONT_SCALES.find((s) => s.key === scale)?.percent ?? 100;
}

interface FontSizeState {
  scale: FontScaleKey;
  setScale: (scale: FontScaleKey) => void;
}

export const useFontSizeStore = create<FontSizeState>()(
  persist(
    (set) => ({
      scale: 'M',
      setScale: (scale) => set({ scale }),
    }),
    { name: 'article-font', storage: createJSONStorage(() => zustandStorage) },
  ),
);
