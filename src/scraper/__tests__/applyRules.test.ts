import { load } from 'cheerio/slim';

import { applySiteRules } from '@/scraper/applyRules';
import { matchSiteRule } from '@/scraper/ruleMatcher';
import { bundledRuleSet } from '@/scraper/rulesStore';
import type { SiteRule } from '@/scraper/types';

function ruleFor(url: string, title: string): SiteRule {
  const rule = matchSiteRule(bundledRuleSet, url, title);
  if (!rule) {
    throw new Error(`rule not found: ${title}`);
  }
  return rule;
}

describe('applySiteRules(同梱ルール)', () => {
  it('ニュー速クオリティ: blogroll scriptとf984aを除去', () => {
    const $ = load(
      '<body><script src="https://blogroll.livedoor.net/js/blogroll.js"></script><div id="f984a">ad</div><p>本文</p></body>',
    );
    applySiteRules($, ruleFor('http://news4vip.livedoor.biz/archives/1.html', 'ニュー速クオリティ'));
    expect($('script')).toHaveLength(0);
    expect($('#f984a')).toHaveLength(0);
    expect($('p').text()).toBe('本文');
  });

  it('暇人速報: 広告div・iframe・強調span・イチオシ画像を除去', () => {
    const $ = load(
      '<body><div class="article_mid_v2">ad</div><div id="article_low_v2">ad</div>' +
        '<iframe src="x"></iframe>' +
        '<span style="color: #CC0033; font-weight: bold; font-size: 16px;">PR</span>' +
        // style部分一致化により、空白・属性順の揺れた変種も除去できる
        '<span style="font-size: 16px;color: #CC0033;background-color: #e6e6fa;">PR2</span>' +
        '<img src="http://himasoku.com/parts/ichiosi.png">' +
        '<p>本文</p></body>',
    );
    applySiteRules($, ruleFor('http://himasoku.com/archives/1.html', '暇人速報'));
    expect($('div.article_mid_v2, #article_low_v2, iframe, span, img')).toHaveLength(0);
    expect($('p').text()).toBe('本文');
  });

  it('稲妻速報・哲学ニュース: 指定要素を除去', () => {
    const $inazuma = load(
      '<body><div class="ika2">x</div><ul id="anop"><li>a</li></ul><ul class="inc"><li>b</li></ul><p>本文</p></body>',
    );
    applySiteRules($inazuma, ruleFor('http://inazumanews2.com/archives/1.html', '稲妻速報'));
    expect($inazuma('div.ika2, ul#anop, ul.inc')).toHaveLength(0);

    const $tetsugaku = load(
      '<body><span style="font-size: large;">PR</span><blockquote>q</blockquote><p>本文</p></body>',
    );
    applySiteRules(
      $tetsugaku,
      ruleFor('http://blog.livedoor.jp/nwknews/archives/1.html', '哲学ニュース'),
    );
    expect($tetsugaku('span, blockquote')).toHaveLength(0);
  });

  it('VIPPERな俺: 内部リンク(hrefPrefix)と直後の<br>1個を除去', () => {
    const $ = load(
      '<body><p>1: 名無し</p>' +
        '<a href="http://blog.livedoor.jp/news23vip/archives/123.html">関連記事</a><br>' +
        '<a href="http://other.example/keep">残す</a><br>' +
        '<p>本文</p></body>',
    );
    applySiteRules($, ruleFor('http://blog.livedoor.jp/news23vip/archives/9.html', 'VIPPERな俺'));
    expect($('a')).toHaveLength(1);
    expect($('a').attr('href')).toBe('http://other.example/keep');
    expect($('br')).toHaveLength(1);
  });

  it('ワラノート: アフィリンク(hrefNotPrefix)+直後<br>2個と末尾<br>6個を除去', () => {
    const brs = '<br><br><br><br><br><br>';
    const $ = load(
      '<body>' +
        '<div class="amazon Default">affi</div>' +
        '<a href="http://affi.example/item" title="商品">商品リンク</a><br><br>' +
        '<a href="https://livedoor.blogimg.jp/waranote2/imgs/a.jpg" title="画像">画像リンク</a>' +
        '<p>本文</p>' +
        brs +
        '</body>',
    );
    applySiteRules($, ruleFor('http://waranote.livedoor.biz/archives/1.html', 'ワラノート'));
    expect($('div.amazon')).toHaveLength(0);
    expect($('a')).toHaveLength(1);
    expect($('a').attr('title')).toBe('画像');
    expect($('br')).toHaveLength(0);
  });
});
