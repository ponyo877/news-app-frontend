import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/stores/mmkv';

// プッシュ通知の許諾フロー状態と設定。
// OSの許諾プロンプトは一度拒否されると二度と出せないため、
// 自前のプレ許諾ダイアログ(promptDone)を挟んで1回だけ丁寧に聞く
interface NotificationState {
  // プレ許諾ダイアログを表示済みか(承諾・拒否を問わず1回きり)
  promptDone: boolean;
  // 人気記事ダイジェスト(朝・夜)を受け取るか。設定画面のトグルと連動
  digestEnabled: boolean;
  // 祭り速報(複数サイト同時まとめの検知)を受け取るか
  matsuriEnabled: boolean;
  setPromptDone: () => void;
  setDigestEnabled: (enabled: boolean) => void;
  setMatsuriEnabled: (enabled: boolean) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      promptDone: false,
      digestEnabled: true,
      matsuriEnabled: true,
      setPromptDone: () => set({ promptDone: true }),
      setDigestEnabled: (digestEnabled) => set({ digestEnabled }),
      setMatsuriEnabled: (matsuriEnabled) => set({ matsuriEnabled }),
    }),
    { name: 'notification', storage: createJSONStorage(() => zustandStorage) },
  ),
);
