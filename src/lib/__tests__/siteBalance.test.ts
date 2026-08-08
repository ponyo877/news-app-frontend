import { balanceSitePage } from '@/lib/siteBalance';

function page(siteIds: string[]) {
  return siteIds.map((siteID, i) => ({ siteID, id: `${siteID}-${i}` }));
}

describe('balanceSitePage', () => {
  it('同一サイトの連続は上限2で分断される', () => {
    const balanced = balanceSitePage(page(['a', 'a', 'a', 'b', 'c']));
    expect(balanced.map((x) => x.siteID)).toEqual(['a', 'a', 'b', 'c', 'a']);
  });

  it('同一サイトはページ内上限5で末尾送りになる', () => {
    const input = page(['a', 'a', 'b', 'a', 'a', 'b', 'a', 'a', 'b', 'c']);
    const balanced = balanceSitePage(input);
    const inMain = balanced.slice(0, 8).filter((x) => x.siteID === 'a');
    expect(inMain.length).toBeLessThanOrEqual(5);
  });

  it('入力と出力は同一の記事集合(記事を失わない)', () => {
    const input = page(['a', 'a', 'a', 'a', 'a', 'a', 'a', 'b']);
    const balanced = balanceSitePage(input);
    expect(balanced).toHaveLength(input.length);
    expect(new Set(balanced.map((x) => x.id))).toEqual(new Set(input.map((x) => x.id)));
  });

  it('偏りのない入力は順序が変わらない', () => {
    const input = page(['a', 'b', 'c', 'a', 'b', 'c']);
    expect(balanceSitePage(input)).toEqual(input);
  });
});
