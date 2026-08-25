import { load } from 'cheerio/slim';

import { applyCommonRules, applySiteRules } from '@/scraper/applyRules';
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
    applySiteRules(
      $,
      ruleFor('http://news4vip.livedoor.biz/archives/1.html', 'ニュー速クオリティ'),
    );
    expect($('script')).toHaveLength(0);
    expect($('#f984a')).toHaveLength(0);
    expect($('p').text()).toBe('本文');
  });

  it('暇人速報: 広告div・自前広告iframe・強調span・イチオシ画像を除去(YouTubeは残す)', () => {
    const $ = load(
      '<body><div class="article_mid_v2">ad</div><div id="article_low_v2">ad</div>' +
        '<iframe src="http://himasoku.com/ueko2017.htm"></iframe>' +
        '<iframe src="https://www.youtube.com/embed/abc"></iframe>' +
        '<span style="color: #CC0033; font-weight: bold; font-size: 16px;">PR</span>' +
        // style部分一致化により、空白・属性順の揺れた変種も除去できる
        '<span style="font-size: 16px;color: #CC0033;background-color: #e6e6fa;">PR2</span>' +
        '<img src="http://himasoku.com/parts/ichiosi.png">' +
        '<p>本文</p></body>',
    );
    applySiteRules($, ruleFor('http://himasoku.com/archives/1.html', '暇人速報'));
    expect($('div.article_mid_v2, #article_low_v2, span, img')).toHaveLength(0);
    expect($('iframe[src*="himasoku.com"]')).toHaveLength(0);
    expect($('iframe[src*="youtube.com"]')).toHaveLength(1);
    expect($('p').text()).toBe('本文');
  });

  it('稲妻速報・哲学ニュース: 指定要素を除去', () => {
    const $inazuma = load(
      '<body><div class="ika2">x</div><ul id="anop"><li>a</li></ul><ul class="inc"><li>b</li></ul><p>本文</p></body>',
    );
    applySiteRules($inazuma, ruleFor('http://inazumanews2.com/archives/1.html', '稲妻速報'));
    expect($inazuma('div.ika2, ul#anop, ul.inc')).toHaveLength(0);

    // blockquote一括除去はXポスト埋め込みまで消していたため、埋め込みは除外する
    const $tetsugaku = load(
      '<body><span style="font-size: large;">PR</span><blockquote>q</blockquote>' +
        '<blockquote class="twitter-tweet"><a href="https://x.com/a/status/1"></a></blockquote>' +
        '<p>本文</p></body>',
    );
    applySiteRules(
      $tetsugaku,
      ruleFor('http://blog.livedoor.jp/nwknews/archives/1.html', '哲学ニュース'),
    );
    expect($tetsugaku('span')).toHaveLength(0);
    expect($tetsugaku('blockquote')).toHaveLength(1);
    expect($tetsugaku('blockquote.twitter-tweet')).toHaveLength(1);
  });

  it('ニュー速VIPワイド: 広告だけのcenterと自前iframeは除去し、画像入りcenterとYouTubeは残す', () => {
    const $ = load(
      '<body><center><script>var adstir_vars = {};</script></center>' +
        '<center><img src="https://example.com/a.jpg"></center>' +
        '<iframe src="//news4wide.up.seesaa.net/common/under.html"></iframe>' +
        '<iframe src="https://www.youtube.com/embed/abc"></iframe>' +
        '<p>本文</p></body>',
    );
    applySiteRules($, ruleFor('http://news4wide.net/archives/1.html', 'ニュー速VIPワイド'));
    expect($('center')).toHaveLength(1);
    expect($('center img')).toHaveLength(1);
    expect($('iframe')).toHaveLength(1);
    expect($('iframe').attr('src')).toContain('youtube.com');
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

// 【AdMobポリシー対応】本文中のリンクは全て無効化されるため、
// ブログサービス由来の誘導ボタン・リンク集が残ると
// 「押せそうに見えて何も起きない」要素になる(サイトの動作: ナビゲーション)
describe('applyCommonRules', () => {
  it('livedoorアプリのフォロー誘導ブロックを落とす(本文は残す)', () => {
    const $ = load(
      '<body><div class="ldapp-article"><a class="ldapp-article-link-button" href="http://x">' +
        'ライブドアアプリでフォローする</a></div><p>本文</p></body>',
    );
    applyCommonRules($);
    expect($('div.ldapp-article')).toHaveLength(0);
    expect($('body').text()).toContain('本文');
  });

  it('Bp2アンテナが差し込む外部リンク集を落とす(本文は残す)', () => {
    const $ = load(
      '<body><a class="Bp2ArchiveOne" href="http://x">よそのまとめ記事</a>' +
        '<p id="ArchivePowerdByBottom">powerd by</p><p>本文</p></body>',
    );
    applyCommonRules($);
    expect($('a.Bp2ArchiveOne')).toHaveLength(0);
    expect($('#ArchivePowerdByBottom')).toHaveLength(0);
    expect($('body').text()).toContain('本文');
  });

  // 本文に残ったJSはWebViewで実行され、除去した広告やリンク集を描き直す
  it('本文のscript/noscriptを落とす', () => {
    const $ = load(
      '<body><p>本文</p><script src="https://bp2-antena.com/js/parts/bp2_archive_bottom.js"></script>' +
        '<noscript><iframe src="ad"></iframe></noscript></body>',
    );
    applyCommonRules($);
    expect($('script')).toHaveLength(0);
    expect($('noscript')).toHaveLength(0);
    expect($('body').text()).toContain('本文');
  });

  // 1.51でscriptを一律除去した結果、JSで描画するXポスト・imgur・Instagramが
  // 空白になった(本番670記事の23%)。埋め込みがある場合だけ描画スクリプトを足す
  it('Xポスト・imgurの埋め込みがあれば、サイトのscriptを落とした上で描画スクリプトを1本ずつ足す', () => {
    const $ = load(
      '<body><blockquote class="twitter-tweet"><a href="https://twitter.com/a/status/1"></a></blockquote>' +
        '<script async src="https://platform.twitter.com/widgets.js"></script>' +
        '<blockquote class="twitter-tweet"><a href="https://x.com/a/status/2"></a></blockquote>' +
        '<script async src="//platform.x.com/widgets.js"></script>' +
        '<blockquote class="imgur-embed-pub" data-id="abc"></blockquote>' +
        '<script async src="//s.imgur.com/min/embed.js"></script>' +
        '<script>var adstir_vars = {};</script><p>本文</p></body>',
    );
    applyCommonRules($);
    expect($('script')).toHaveLength(2);
    expect($('script[src="https://platform.twitter.com/widgets.js"]')).toHaveLength(1);
    expect($('script[src="https://s.imgur.com/min/embed.js"]')).toHaveLength(1);
    expect($('blockquote.twitter-tweet')).toHaveLength(2);
    expect($('blockquote.imgur-embed-pub')).toHaveLength(1);
  });

  it('埋め込みが無い本文にはscriptを足さない', () => {
    const $ = load('<body><p>本文</p><script>var adstir_vars = {};</script></body>');
    applyCommonRules($);
    expect($('script')).toHaveLength(0);
  });

  // lazyload系はJSを落とすと画像が一生読み込まれない
  it('src無しのlazyload画像はdata-srcをsrcへ移す', () => {
    const $ = load(
      '<body><img data-src="https://example.com/a.jpg" class="lozad">' +
        '<img src="data:image/gif;base64,R0lGOD" data-original="https://example.com/b.jpg">' +
        '<img src="https://example.com/c.jpg" data-src="https://example.com/wrong.jpg"></body>',
    );
    applyCommonRules($);
    const srcs = $('img')
      .toArray()
      .map((img) => $(img).attr('src'));
    expect(srcs).toEqual([
      'https://example.com/a.jpg',
      'https://example.com/b.jpg',
      'https://example.com/c.jpg',
    ]);
  });
});
