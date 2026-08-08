import { filterArticles, normalizeForMatch } from '@/lib/articleFilter';

const articles = [
  { titles: '【朗報】サッカー日本代表が勝利', siteID: 'site-a' },
  { titles: 'ﾊﾟﾁﾝｺ屋の思い出', siteID: 'site-b' },
  { titles: 'Apple新製品発表', siteID: 'site-c' },
];

describe('normalizeForMatch', () => {
  it('全角英数・半角カナ・大文字を正規化する', () => {
    expect(normalizeForMatch('ＡＰＰＬＥ')).toBe('apple');
    expect(normalizeForMatch('ﾊﾟﾁﾝｺ')).toBe('パチンコ');
  });
});

describe('filterArticles', () => {
  it('ブロックサイトの記事を除外する', () => {
    const filtered = filterArticles(articles, ['site-a'], []);
    expect(filtered.map((a) => a.siteID)).toEqual(['site-b', 'site-c']);
  });

  it('NGワードを含むタイトルを除外する(部分一致)', () => {
    const filtered = filterArticles(articles, [], ['サッカー']);
    expect(filtered).toHaveLength(2);
  });

  it('表記揺れ(全角/半角・大文字/小文字)を吸収する', () => {
    expect(filterArticles(articles, [], ['apple'])).toHaveLength(2);
    expect(filterArticles(articles, [], ['パチンコ'])).toHaveLength(2);
  });

  it('フィルタが空なら恒等(同一内容)', () => {
    expect(filterArticles(articles, [], [])).toEqual(articles);
  });
});
