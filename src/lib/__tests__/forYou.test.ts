import { applySiteCap, computeSiteAffinity, dedupeById, rankForYou } from '@/lib/forYou';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

function article(id: string, siteID: string, ageHours = 1) {
  return { id, siteID, publishedAt: new Date(NOW - ageHours * 60 * 60 * 1000).toISOString() };
}

describe('computeSiteAffinity', () => {
  it('直近閲覧のサイトが最大スコア1に正規化される', () => {
    const affinity = computeSiteAffinity({
      history: [
        { siteID: 'site-a', viewedAt: NOW },
        { siteID: 'site-a', viewedAt: NOW },
        { siteID: 'site-b', viewedAt: NOW },
      ],
      favoriteSiteIds: [],
      preferredSiteIds: [],
      now: NOW,
    });
    expect(affinity.get('site-a')).toBe(1);
    expect(affinity.get('site-b')).toBe(0.5);
  });

  it('14日前の閲覧は重み半減(指数減衰)', () => {
    const affinity = computeSiteAffinity({
      history: [
        { siteID: 'recent', viewedAt: NOW },
        { siteID: 'old', viewedAt: NOW - 14 * DAY },
      ],
      favoriteSiteIds: [],
      preferredSiteIds: [],
      now: NOW,
    });
    expect(affinity.get('old')).toBeCloseTo(0.5, 5);
  });

  it('favoriteとオンボーディング選択がボーナスになる', () => {
    const affinity = computeSiteAffinity({
      history: [{ siteID: 'read-only', viewedAt: NOW }],
      favoriteSiteIds: ['fav-site'],
      preferredSiteIds: ['onboard-site'],
      now: NOW,
    });
    expect(affinity.get('onboard-site')).toBe(1); // 3.0が最大
    expect(affinity.get('fav-site')).toBeCloseTo(2 / 3, 5);
  });

  it('コールドスタート(全シグナルなし)は空Map', () => {
    const affinity = computeSiteAffinity({
      history: [],
      favoriteSiteIds: [],
      preferredSiteIds: [],
      now: NOW,
    });
    expect(affinity.size).toBe(0);
  });
});

describe('rankForYou', () => {
  const baseInput = {
    affinity: new Map<string, number>(),
    readIds: {} as Record<string, true>,
    dailyRank: new Map<string, number>(),
    weeklyRank: new Map<string, number>(),
    seed: 42,
    now: NOW,
  };

  it('コールドスタートでは新しさ+人気で並ぶ', () => {
    const fresh = article('fresh', 's1', 1);
    const stale = article('stale', 's2', 72);
    const ranked = rankForYou([stale, fresh], baseInput);
    expect(ranked[0]?.id).toBe('fresh');
  });

  it('親和度の高いサイトが優先される', () => {
    const affinityArticle = article('liked', 'fav-site', 12);
    const other = article('other', 'other-site', 12);
    const ranked = rankForYou([other, affinityArticle], {
      ...baseInput,
      affinity: new Map([['fav-site', 1]]),
    });
    expect(ranked[0]?.id).toBe('liked');
  });

  it('既読は除外されず降格される', () => {
    const read = article('read', 's1', 1);
    const unread = article('unread', 's2', 48);
    const ranked = rankForYou([read, unread], {
      ...baseInput,
      readIds: { read: true },
    });
    expect(ranked.map((a) => a.id)).toContain('read');
    expect(ranked[0]?.id).toBe('unread');
  });

  it('同一seedなら決定的、seedが変われば並びが変わりうる', () => {
    const candidates = Array.from({ length: 20 }, (_, i) => article(`id-${i}`, `site-${i}`, i));
    const first = rankForYou(candidates, baseInput).map((a) => a.id);
    const second = rankForYou(candidates, baseInput).map((a) => a.id);
    expect(first).toEqual(second);
  });
});

describe('applySiteCap', () => {
  it('同一サイトは上限を超えた分が末尾へ送られ、記事は失われない', () => {
    const articles = [
      { siteID: 'a' },
      { siteID: 'a' },
      { siteID: 'a' },
      { siteID: 'a' },
      { siteID: 'b' },
    ];
    const capped = applySiteCap(articles, 3);
    expect(capped).toHaveLength(5);
    expect(capped.slice(0, 4).map((a) => a.siteID)).toEqual(['a', 'a', 'a', 'b']);
    expect(capped[4]?.siteID).toBe('a');
  });
});

describe('dedupeById', () => {
  it('同一IDの後発を除去する', () => {
    const deduped = dedupeById([{ id: 'x' }, { id: 'y' }, { id: 'x' }]);
    expect(deduped.map((a) => a.id)).toEqual(['x', 'y']);
  });
});
