import { storage } from '@/stores/mmkv';

// ルールの「風化」検知(P4): サイト改装等でセレクタが1件もマッチしなくなった場合、
// 広告が再表示されるだけで誰も気付けない。0マッチをdevログ+永続カウンタに記録し、
// 将来のデバッグメニュー/クラッシュレポート連携の足場にする
const MISS_COUNTS_KEY = 'scraperRuleMisses.v1';
const MAX_TRACKED_ENTRIES = 100;

export function reportSelectorMiss(siteName: string, description: string): void {
  if (__DEV__) {
    console.warn(`[scraper] ルール不一致(0マッチ): ${siteName} → ${description}`);
  }
  try {
    const counts = readMissCounts();
    const key = `${siteName}|${description}`;
    if (counts[key] === undefined && Object.keys(counts).length >= MAX_TRACKED_ENTRIES) {
      return;
    }
    counts[key] = (counts[key] ?? 0) + 1;
    storage.set(MISS_COUNTS_KEY, JSON.stringify(counts));
  } catch {
    // 統計はベストエフォート
  }
}

export function getRuleMissReport(): Record<string, number> {
  return readMissCounts();
}

function readMissCounts(): Record<string, number> {
  const raw = storage.getString(MISS_COUNTS_KEY);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}
