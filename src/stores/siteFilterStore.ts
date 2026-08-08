import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { logEvent } from '@/lib/analytics';
import { zustandStorage } from '@/stores/mmkv';

// 非表示(ブロック)にしたサイトID。旧版の mySkipIDs.csv に相当。
// preferredSiteIds はオンボーディングで選んだ「よく見るサイト」
// (for Youの親和度シードにのみ使う。ブロックの逆利用はしない)
interface SiteFilterState {
  blockedSiteIds: string[];
  preferredSiteIds: string[];
  blockSite: (siteId: string) => void;
  toggleSite: (siteId: string) => void;
  setBlockedSiteIds: (ids: string[]) => void;
  setPreferredSiteIds: (ids: string[]) => void;
}

export const useSiteFilterStore = create<SiteFilterState>()(
  persist(
    (set) => ({
      blockedSiteIds: [],
      preferredSiteIds: [],
      blockSite: (siteId) =>
        set((s) => {
          if (s.blockedSiteIds.includes(siteId)) {
            return s;
          }
          logEvent('site_block', { site_id: siteId, blocked: true });
          return { blockedSiteIds: [...s.blockedSiteIds, siteId] };
        }),
      toggleSite: (siteId) =>
        set((s) => {
          const blocked = !s.blockedSiteIds.includes(siteId);
          logEvent('site_block', { site_id: siteId, blocked });
          return {
            blockedSiteIds: blocked
              ? [...s.blockedSiteIds, siteId]
              : s.blockedSiteIds.filter((id) => id !== siteId),
          };
        }),
      setBlockedSiteIds: (ids) => set({ blockedSiteIds: ids }),
      setPreferredSiteIds: (ids) => set({ preferredSiteIds: ids }),
    }),
    { name: 'site-filter', storage: createJSONStorage(() => zustandStorage) },
  ),
);
