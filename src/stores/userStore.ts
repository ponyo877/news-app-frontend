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
  setName: (name: string) => void;
  setAvatarId: (avatarId: number) => void;
  setDevicehash: (devicehash: string) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      name: DEFAULT_USER_NAME,
      avatarId: DEFAULT_AVATAR_ID,
      devicehash: null,
      setName: (name) => set({ name }),
      setAvatarId: (avatarId) => set({ avatarId }),
      setDevicehash: (devicehash) => set({ devicehash }),
    }),
    { name: 'user', storage: createJSONStorage(() => zustandStorage) },
  ),
);
