import { withFeedAds } from '@/lib/feedAds';

// テスト用: 記事の代わりに連番文字列を流し、配置だけを検証する
const keyOf = (article: string, index: number) => `${article}-${index}`;

// 結果を "記事の中身 / AD" の並びに畳んで、位置を目視しやすくする
function shape(entries: ReturnType<typeof withFeedAds<string>>): string[] {
  return entries.map((entry) => (entry.type === 'ad' ? 'AD' : entry.article));
}

function articles(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `a${i}`);
}

describe('withFeedAds', () => {
  it('先頭3件までは広告を出さない', () => {
    expect(shape(withFeedAds(articles(3), keyOf))).toEqual(['a0', 'a1', 'a2']);
  });

  it('4件目の手前に最初の広告が入る', () => {
    expect(shape(withFeedAds(articles(4), keyOf))).toEqual(['a0', 'a1', 'a2', 'AD', 'a3']);
  });

  it('以降は12件ごとに1枠入る', () => {
    const entries = shape(withFeedAds(articles(28), keyOf));
    // 広告が入るのは先頭3件の後と、そこから12件ごと
    const adPositions = entries.flatMap((e, i) => (e === 'AD' ? [i] : []));
    expect(adPositions).toEqual([3, 16, 29]);
    // 記事の並び自体は元のまま
    expect(entries.filter((e) => e !== 'AD')).toEqual(articles(28));
  });

  it('0件・少数件では広告が入らない', () => {
    expect(shape(withFeedAds([], keyOf))).toEqual([]);
    expect(shape(withFeedAds(articles(1), keyOf))).toEqual(['a0']);
  });

  it('末尾が広告にならない(必ず記事で終わる)', () => {
    for (let count = 1; count <= 40; count += 1) {
      const entries = withFeedAds(articles(count), keyOf);
      expect(entries[entries.length - 1]?.type).toBe('article');
    }
  });

  it('広告を挟んでも記事の元インデックスは保持される(ランキング順位用)', () => {
    const entries = withFeedAds(articles(10), keyOf);
    const indices = entries.flatMap((entry) => (entry.type === 'article' ? [entry.index] : []));
    expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('keyはすべて一意', () => {
    const keys = withFeedAds(articles(30), keyOf).map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
