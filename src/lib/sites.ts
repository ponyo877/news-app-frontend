import type { Site } from '@/api/schemas';

// クロールが止まっているサイト(サイト側休止など)の判定。
// last_updated_at が30日以上前なら新着が来ておらず、オンボーディングや
// サイト選択で見せても体験に寄与しない
const ACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function isActiveSite(site: Pick<Site, 'last_updated_at'>, now: number): boolean {
  const updatedAt = Date.parse(site.last_updated_at);
  if (Number.isNaN(updatedAt)) {
    return false;
  }
  return now - updatedAt <= ACTIVE_WINDOW_MS;
}
