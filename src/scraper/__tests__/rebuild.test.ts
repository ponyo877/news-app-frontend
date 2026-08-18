import { load } from 'cheerio/slim';

import { rebuildBody, rebuildHead } from '@/scraper/engines/livedoor';
import { serialize, stripLinkHrefs, SOURCE_LINK_URL } from '@/scraper/serialize';
import { buildLivedoorHtml } from '@/scraper/__fixtures__/builders';

describe('rebuildHead', () => {
  it('stylesheet・style・viewportのみ残す', () => {
    const $ = load(buildLivedoorHtml({ bodyContent: '<p>本文</p>' }));
    rebuildHead($);
    expect($('head link[rel="stylesheet"]')).toHaveLength(1);
    expect($('head style')).toHaveLength(1);
    expect($('head meta[name="viewport"]')).toHaveLength(1);
    expect($('head script')).toHaveLength(0);
    expect($('head meta[name="description"]')).toHaveLength(0);
  });
});

describe('rebuildBody', () => {
  it('タイトル2つと本文のみの階層に再構成する(サイドバー・記事外広告は除去)', () => {
    const $ = load(buildLivedoorHtml({ bodyContent: '<p>本文</p>' }));
    rebuildBody($);
    expect($('body .sidebar')).toHaveLength(0);
    expect($('body .ad-block')).toHaveLength(0);
    expect($('body header.section-box')).toHaveLength(2);
    expect($('body div.article-body-outer p').text()).toBe('本文');
    expect($('body > div.container > div.container-inner > div.content')).toHaveLength(1);
  });
});

describe('stripLinkHrefs', () => {
  it('target付きリンクのhrefを剥奪する', () => {
    const $ = load('<body><a href="http://x.example" target="_blank">x</a></body>');
    stripLinkHrefs($);
    expect($('a').attr('href')).toBeUndefined();
  });

  // 旧実装は a[target] だけを見ていたため、これらはhrefが残ったまま
  // WebView側で遮断され「押せるのに無反応」になっていた
  it('target無しのリンクもhrefを剥奪する', () => {
    const $ = load('<body><a href="/archives/2.html">安価</a></body>');
    stripLinkHrefs($);
    expect($('a').attr('href')).toBeUndefined();
  });

  // 【AdMobポリシー対応】剥奪しただけでは青字・下線のまま残るため、
  // 見た目もリンクでなくすクラスを付ける
  it('無効化したリンクにapp-inertを付ける', () => {
    const $ = load('<body><a href="http://x.example" target="_blank">x</a></body>');
    stripLinkHrefs($);
    expect($('a').hasClass('app-inert')).toBe(true);
  });
});

describe('serialize', () => {
  const source = { url: 'http://himasoku.com/archives/1.html', siteName: '暇人速報' };

  it('head+bodyのouterHTMLを出力する(旧版と同形式)', () => {
    const $ = load('<html><head><style>.a{}</style></head><body><p>b</p></body></html>');
    const html = serialize($, source);
    expect(html.startsWith('<head>')).toBe(true);
    expect(html.endsWith('</body>')).toBe(true);
  });

  it('本文末尾に下部余白を注入する(最終行が広告ブロックに張り付かないように)', () => {
    const $ = load('<html><head></head><body><p>b</p></body></html>');
    expect(serialize($, source)).toContain('padding-bottom:24px');
  });

  it('余白スタイルは取得元のCSSより後(head末尾)に入る', () => {
    const $ = load('<html><head><style>.a{}</style></head><body><p>b</p></body></html>');
    const html = serialize($, source);
    expect(html.indexOf('.a{}')).toBeLessThan(html.indexOf('padding-bottom'));
  });

  it('取得元のhead内容を壊さない', () => {
    const $ = load(
      '<html><head><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/a.css"></head><body><p>b</p></body></html>',
    );
    const html = serialize($, source);
    expect(html).toContain('name="viewport"');
    expect(html).toContain('/a.css');
  });

  // 本文中のリンクをすべて無効化している以上、実際に開ける導線を1つ残す
  it('出典と元記事リンクを本文末尾に付ける', () => {
    const $ = load('<html><head></head><body><p>b</p></body></html>');
    const html = serialize($, source);
    // cheerioは非ASCIIを数値文字参照で書き出すため、文言はDOM側で確認する
    expect($('body > footer.app-source').text()).toContain('出典: 暇人速報');
    expect(html).toContain(`href="${SOURCE_LINK_URL}"`);
  });

  it('出典リンクはstripLinkHrefsの後に足すのでhrefが残る', () => {
    const $ = load('<html><head></head><body><a href="http://x.example">x</a></body></html>');
    stripLinkHrefs($);
    const html = serialize($, source);
    expect(html).not.toContain('href="http://x.example"');
    expect(html).toContain(`href="${SOURCE_LINK_URL}"`);
  });
});
