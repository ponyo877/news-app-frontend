// for You タブの端末内リランク(純関数)。
// 主役はCloudflare推薦(api/recs.ts)で、これはそのフォールバック:
// オフライン・Worker障害・履歴が古すぎてベクトルが引けない場合でも
// 「新着×人気×サイト親和度」のブレンドとして成立する(旧daily複製より常に良い)

export interface AffinityInput {
  history: readonly { siteID: string; viewedAt: number }[];
  favoriteSiteIds: readonly string[];
  preferredSiteIds: readonly string[];
  now: number;
}

// 閲覧の重みが半減する日数
const HALF_LIFE_DAYS = 14;
// お気に入り1件 = 直近の閲覧2回分(明示的シグナルは強い)
const FAVORITE_BONUS = 2.0;
// オンボーディングの選択(初期シグナル。履歴が貯まると相対的に薄まる)
const ONBOARDING_BONUS = 3.0;

const DAY_MS = 24 * 60 * 60 * 1000;

// サイト親和度スコア([0,1]正規化)。空履歴なら空Map(コールドスタート)
export function computeSiteAffinity({
  history,
  favoriteSiteIds,
  preferredSiteIds,
  now,
}: AffinityInput): Map<string, number> {
  const raw = new Map<string, number>();
  const add = (siteId: string, score: number) => {
    if (siteId !== '') {
      raw.set(siteId, (raw.get(siteId) ?? 0) + score);
    }
  };
  for (const entry of history) {
    const ageDays = Math.max(0, now - entry.viewedAt) / DAY_MS;
    add(entry.siteID, 0.5 ** (ageDays / HALF_LIFE_DAYS));
  }
  for (const siteId of favoriteSiteIds) {
    add(siteId, FAVORITE_BONUS);
  }
  for (const siteId of preferredSiteIds) {
    add(siteId, ONBOARDING_BONUS);
  }
  const max = Math.max(0, ...raw.values());
  if (max === 0) {
    return new Map();
  }
  return new Map([...raw].map(([siteId, score]) => [siteId, score / max]));
}

export interface RankInput {
  affinity: Map<string, number>;
  readIds: Readonly<Record<string, true>>;
  // 記事ID → ランキング順位(0始まり)。dailyを主、weeklyを従とする
  dailyRank: Map<string, number>;
  weeklyRank: Map<string, number>;
  // refetchごとに変わるシード。表示中の並びを安定させつつ毎回同じ順にもしない
  seed: number;
  now: number;
}

const W_AFFINITY = 0.5;
const W_FRESHNESS = 0.3;
const W_POPULARITY = 0.2;
// 既読は除外せず大幅降格(コールドスタート時の空リスト防止)
const READ_PENALTY = 0.1;
// 履歴のないサイトへの探索加点(フィルターバブル防止)
const UNKNOWN_SITE_BONUS = 0.05;
// ディザリング幅(押し付けがましい固定順を避ける)
const EXPLORE_EPSILON = 0.15;
const RANK_SIZE = 15;
const MAX_PER_SITE = 3;
const LIST_SIZE = 30;
const FRESH_HALF_LIFE_HOURS = 24;

// 決定的な疑似乱数(seedと記事IDから[0,1))。Math.random不使用で並びが再現可能
function seededRandom(seed: number, id: string): number {
  let hash = seed >>> 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return (hash % 10_000) / 10_000;
}

export function rankForYou<T extends { id: string; siteID: string; publishedAt: string }>(
  candidates: readonly T[],
  { affinity, readIds, dailyRank, weeklyRank, seed, now }: RankInput,
): T[] {
  const hasHistory = affinity.size > 0;
  const scored = candidates.map((article) => {
    const ageHours = Math.max(0, now - Date.parse(article.publishedAt)) / (60 * 60 * 1000);
    const freshness = 0.5 ** (ageHours / FRESH_HALF_LIFE_HOURS);
    const daily = dailyRank.get(article.id);
    const weekly = weeklyRank.get(article.id);
    const popularity =
      daily !== undefined
        ? 1 - daily / RANK_SIZE
        : weekly !== undefined
          ? 0.5 * (1 - weekly / RANK_SIZE)
          : 0;
    const siteAffinity = affinity.get(article.siteID) ?? 0;
    let score = W_AFFINITY * siteAffinity + W_FRESHNESS * freshness + W_POPULARITY * popularity;
    if (siteAffinity === 0 && hasHistory) {
      score += UNKNOWN_SITE_BONUS;
    }
    if (readIds[article.id]) {
      score *= READ_PENALTY;
    }
    score += EXPLORE_EPSILON * seededRandom(seed, article.id);
    return { article, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return applySiteCap(
    scored.map((s) => s.article),
    MAX_PER_SITE,
  ).slice(0, LIST_SIZE);
}

// 同一サイト上限。超過分は破棄せず末尾へ送る(候補が薄いときの空リスト防止)
export function applySiteCap<T extends { siteID: string }>(articles: readonly T[], cap: number): T[] {
  const result: T[] = [];
  const overflow: T[] = [];
  const countBySite = new Map<string, number>();
  for (const article of articles) {
    const count = countBySite.get(article.siteID) ?? 0;
    if (count >= cap) {
      overflow.push(article);
      continue;
    }
    result.push(article);
    countBySite.set(article.siteID, count + 1);
  }
  return [...result, ...overflow];
}

export function dedupeById<T extends { id: string }>(articles: readonly T[]): T[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    if (seen.has(article.id)) {
      return false;
    }
    seen.add(article.id);
    return true;
  });
}
