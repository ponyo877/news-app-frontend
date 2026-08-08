import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/stores/mmkv';

export const DEFAULT_USER_NAME = 'まとめくん';
export const DEFAULT_AVATAR_ID = 1;

// プロフィール(旧版のshared_preferences Name/Icon/devicehashに相当)
interface UserState {
  name: string;
  avatarId: number; // 1..22 (assets/avatars/myimage_N.png)
  devicehash: string | null;
  // 初回オンボーディング(サイト選択)を消化済みか。既存ユーザーはdevicehash設定済みなので表示対象外
  onboardingDone: boolean;
  setName: (name: string) => void;
  setAvatarId: (avatarId: number) => void;
  setDevicehash: (devicehash: string) => void;
  setOnboardingDone: (done: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      name: DEFAULT_USER_NAME,
      avatarId: DEFAULT_AVATAR_ID,
      devicehash: null,
      onboardingDone: false,
      setName: (name) => set({ name }),
      setAvatarId: (avatarId) => set({ avatarId }),
      setDevicehash: (devicehash) => set({ devicehash }),
      setOnboardingDone: (onboardingDone) => set({ onboardingDone }),
    }),
    { name: 'user', storage: createJSONStorage(() => zustandStorage) },
  ),
);
