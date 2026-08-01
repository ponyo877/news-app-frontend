import { matchSiteRule } from '@/scraper/ruleMatcher';
import { bundledRuleSet } from '@/scraper/rulesStore';

describe('matchSiteRule', () => {
  it('URLホスト名でマッチする(スキーム・www無視)', () => {
    expect(matchSiteRule(bundledRuleSet, 'http://himasoku.com/archives/1.html', '')?.name).toBe(
      '暇人速報',
    );
    expect(matchSiteRule(bundledRuleSet, 'https://himasoku.com/archives/1.html', '')?.name).toBe(
      '暇人速報',
    );
    expect(
      matchSiteRule(bundledRuleSet, 'https://www.himasoku.com/archives/1.html', '')?.name,
    ).toBe('暇人速報');
  });

  it('独自ドメイン移行済みサイト(nwknews.jp)もURLでマッチする', () => {
    expect(matchSiteRule(bundledRuleSet, 'https://nwknews.jp/archives/6250764.html', '')?.name).toBe(
      '哲学ニュース',
    );
    expect(
      matchSiteRule(bundledRuleSet, 'http://digital-thread.com/archives/1.html', '')?.name,
    ).toBe('デジタルニューススレッド');
  });

  it('共有ホスト(blog.livedoor.jp)はパスプレフィックスで区別する', () => {
    expect(
      matchSiteRule(bundledRuleSet, 'http://blog.livedoor.jp/news23vip/archives/1.html', '')?.name,
    ).toBe('VIPPERな俺');
    expect(
      matchSiteRule(bundledRuleSet, 'http://blog.livedoor.jp/nwknews/archives/1.html', '')?.name,
    ).toBe('哲学ニュース');
    // 同居ブログ(痛いニュース)は自分のルールにマッチし、他ブログを誤マッチしない
    expect(
      matchSiteRule(bundledRuleSet, 'http://blog.livedoor.jp/dqnplus/archives/1.html', '')?.name,
    ).toBe('痛いニュース(ノ∀`)');
    // ルール未定義の同居ブログは誤マッチしない
    expect(
      matchSiteRule(bundledRuleSet, 'http://blog.livedoor.jp/no-such-blog/archives/1.html', ''),
    ).toBeUndefined();
  });

  it('URLで特定できない場合はsitetitleでフォールバックする(旧版互換)', () => {
    expect(
      matchSiteRule(bundledRuleSet, 'http://unknown-mirror.example/a.html', 'ワラノート')?.name,
    ).toBe('ワラノート');
  });

  it('どちらにも該当しなければundefined', () => {
    expect(
      matchSiteRule(bundledRuleSet, 'http://unknown.example/a.html', '未知のサイト'),
    ).toBeUndefined();
  });
});
