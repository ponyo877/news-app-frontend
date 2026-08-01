import { detectEngine } from '@/scraper/engines';
import { genericEngine } from '@/scraper/engines/generic';
import { loadDoc } from '@/scraper/htmlLoad';
import type { SiteRule } from '@/scraper/types';

const WP_HTML = `<html><head>
<link rel="stylesheet" href="/style.css"><script src="/head.js"></script>
</head><body>
<header><h1 class="entry-title">記事タイトルです</h1></header>
<div class="sidebar">サイドバー</div>
<div class="entry-content"><p>本文1</p><script src="https://ads.example/x.js"></script><noscript>ns</noscript><p>本文2</p></div>
<footer>フッター</footer>
</body></html>`;

const rule: SiteRule = {
  name: 'テストWP',
  urlPrefixes: ['wp.example.com/'],
  engine: { bodySelector: 'div.entry-content', titleSelector: 'h1.entry-title' },
};

describe('genericEngine', () => {
  it('engine設定のあるルールとセレクタ一致時のみマッチする', () => {
    const $ = loadDoc(WP_HTML);
    expect(detectEngine($, rule)).toBe(genericEngine);
    expect(detectEngine($, undefined)).toBeUndefined();
    expect(detectEngine($, { name: 'x', urlPrefixes: ['wp.example.com/'] })).toBeUndefined();
    expect(
      detectEngine(loadDoc('<html><body><p>別構造</p></body></html>'), rule),
    ).toBeUndefined();
  });

  it('本文+タイトルだけに再構築し、script/noscript/サイドバーを除去する', async () => {
    const $ = loadDoc(WP_HTML);
    await genericEngine.prepare($, () => Promise.reject(new Error('no network')), rule);

    expect($('body .app-blog-title').text()).toBe('テストWP');
    expect($('body .app-article-title').text()).toBe('記事タイトルです');
    const outer = $('div.article-body-outer');
    expect(outer).toHaveLength(1);
    expect(outer.text()).toContain('本文1');
    expect(outer.text()).toContain('本文2');
    expect($('body script')).toHaveLength(0);
    expect($('body noscript')).toHaveLength(0);
    expect($('body').text()).not.toContain('サイドバー');
    expect($('body').text()).not.toContain('フッター');
    // head: stylesheetは残りscriptは消える。viewportが無ければ注入される
    expect($('head link[rel="stylesheet"]')).toHaveLength(1);
    expect($('head script')).toHaveLength(0);
    expect($('head meta[name="viewport"]')).toHaveLength(1);
  });

  it('titleSelector不一致時はタイトル行を出さない', async () => {
    const $ = loadDoc(WP_HTML);
    await genericEngine.prepare($, () => Promise.reject(new Error('no network')), {
      ...rule,
      engine: { bodySelector: 'div.entry-content', titleSelector: 'h9.none' },
    });
    expect($('.app-article-title')).toHaveLength(0);
    expect($('div.article-body-outer').text()).toContain('本文1');
  });

  it('サイト名のHTML特殊文字をエスケープする', async () => {
    const $ = loadDoc(WP_HTML);
    await genericEngine.prepare($, () => Promise.reject(new Error('no network')), {
      ...rule,
      name: '暇人\\(^o^)/速報<s>&',
    });
    expect($('.app-blog-title').text()).toBe('暇人\\(^o^)/速報<s>&');
    expect($('.app-blog-title').find('s')).toHaveLength(0);
  });
});
