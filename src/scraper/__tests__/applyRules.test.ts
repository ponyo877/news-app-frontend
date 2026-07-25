import { load } from 'cheerio/slim';

import { applySiteRules } from '@/scraper/applyRules';

describe('applySiteRules', () => {
  it('ニュー速クオリティ: blogroll scriptとf984aを除去', () => {
    const $ = load(
      '<body><script src="https://blogroll.livedoor.net/js/blogroll.js"></script><div id="f984a">ad</div><p>本文</p></body>',
    );
    applySiteRules($, 'ニュー速クオリティ');
    expect($('script')).toHaveLength(0);
    expect($('#f984a')).toHaveLength(0);
    expect($('p').text()).toBe('本文');
  });

  it('暇人速報: 広告div・iframe・強調span・イチオシ画像を除去', () => {
    const $ = load(
      '<body><div class="article_mid_v2">ad</div><div id="article_low_v2">ad</div>' +
        '<iframe src="x"></iframe>' +
        '<span style="color: #CC0033; font-weight: bold; font-size: 16px;">PR</span>' +
        '<img src="http://himasoku.com/parts/ichiosi.png">' +
        '<p>本文</p></body>',
    );
    applySiteRules($, '暇人速報');
    expect($('div.article_mid_v2')).toHaveLength(0);
    expect($('#article_low_v2')).toHaveLength(0);
    expect($('iframe')).toHaveLength(0);
    expect($('span')).toHaveLength(0);
    expect($('img')).toHaveLength(0);
    expect($('p').text()).toBe('本文');
  });

  it('稲妻速報・哲学ニュース: 指定要素を除去', () => {
    const $inazuma = load(
      '<body><div class="ika2">x</div><ul id="anop"><li>a</li></ul><ul class="inc"><li>b</li></ul><p>本文</p></body>',
    );
    applySiteRules($inazuma, '稲妻速報');
    expect($inazuma('div.ika2, ul#anop, ul.inc')).toHaveLength(0);

    const $tetsugaku = load(
      '<body><span style="font-size: large;">PR</span><blockquote>q</blockquote><p>本文</p></body>',
    );
    applySiteRules($tetsugaku, '哲学ニュース');
    expect($tetsugaku('span, blockquote')).toHaveLength(0);
  });

  it('VIPPERな俺: 内部リンクと直後の<br>1個を除去', () => {
    const $ = load(
      '<body><p>1: 名無し</p>' +
        '<a href="http://blog.livedoor.jp/news23vip/archives/123.html">関連記事</a><br>' +
        '<a href="http://other.example/keep">残す</a><br>' +
        '<p>本文</p></body>',
    );
    applySiteRules($, 'VIPPERな俺');
    expect($('a')).toHaveLength(1);
    expect($('a').attr('href')).toBe('http://other.example/keep');
    expect($('br')).toHaveLength(1); // 内部リンク直後のbrのみ消える
  });

  it('ワラノート: アフィリンク+直後<br>2個と末尾<br>6個を除去', () => {
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
    applySiteRules($, 'ワラノート');
    expect($('div.amazon')).toHaveLength(0);
    // 画像リンク(waranote2/imgs)は残る
    expect($('a')).toHaveLength(1);
    expect($('a').attr('title')).toBe('画像');
    // アフィリンク直後の2個+末尾6個がすべて消える
    expect($('br')).toHaveLength(0);
  });

  it('未定義サイトは何も変更しない', () => {
    const $ = load('<body><iframe src="x"></iframe><p>本文</p></body>');
    applySiteRules($, '未知のサイト');
    expect($('iframe')).toHaveLength(1);
  });
});
