import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/stores/mmkv';

// 非表示(ブロック)にしたサイトID。旧版の mySkipIDs.csv に相当。
interface SiteFilterState {
  blockedSiteIds: string[];
  blockSite: (siteId: string) => void;
  toggleSite: (siteId: string) => void;
  setBlockedSiteIds: (ids: string[]) => void;
}

export const useSiteFilterStore = create<SiteFilterState>()(
  persist(
    (set) => ({
      blockedSiteIds: [],
      blockSite: (siteId) =>
        set((s) =>
          s.blockedSiteIds.includes(siteId)
            ? s
            : { blockedSiteIds: [...s.blockedSiteIds, siteId] },
        ),
      toggleSite: (siteId) =>
        set((s) => ({
          blockedSiteIds: s.blockedSiteIds.includes(siteId)
            ? s.blockedSiteIds.filter((id) => id !== siteId)
            : [...s.blockedSiteIds, siteId],
        })),
      setBlockedSiteIds: (ids) => set({ blockedSiteIds: ids }),
    }),
    { name: 'site-filter', storage: createJSONStorage(() => zustandStorage) },
  ),
);
