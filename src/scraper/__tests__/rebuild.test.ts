import { load } from 'cheerio/slim';

import { rebuildBody, rebuildHead } from '@/scraper/engines/livedoor';
import { serialize, stripLinkHrefs } from '@/scraper/serialize';
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
});

describe('serialize', () => {
  it('head+bodyのouterHTMLを出力する(旧版と同形式)', () => {
    const $ = load('<html><head><style>.a{}</style></head><body><p>b</p></body></html>');
    const html = serialize($);
    expect(html.startsWith('<head>')).toBe(true);
    expect(html.endsWith('</body>')).toBe(true);
  });

  it('本文末尾に下部余白を注入する(最終行が広告ブロックに張り付かないように)', () => {
    const $ = load('<html><head></head><body><p>b</p></body></html>');
    expect(serialize($)).toContain('padding-bottom:24px');
  });

  it('余白スタイルは取得元のCSSより後(head末尾)に入る', () => {
    const $ = load('<html><head><style>.a{}</style></head><body><p>b</p></body></html>');
    const html = serialize($);
    expect(html.indexOf('.a{}')).toBeLessThan(html.indexOf('padding-bottom'));
  });

  it('取得元のhead内容を壊さない', () => {
    const $ = load(
      '<html><head><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/a.css"></head><body><p>b</p></body></html>',
    );
    const html = serialize($);
    expect(html).toContain('name="viewport"');
    expect(html).toContain('/a.css');
  });
});
