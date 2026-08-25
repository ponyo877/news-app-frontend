import { load } from 'cheerio/slim';

import { appendEmbedScripts, isEmbedFrameUrl } from '@/scraper/embeds';

describe('appendEmbedScripts', () => {
  it('本文にある埋め込みの種類ごとに描画スクリプトを1本足す', () => {
    const $ = load(
      '<body><blockquote class="twitter-tweet"><a href="https://x.com/a/status/1"></a></blockquote>' +
        '<blockquote class="twitter-tweet"><a href="https://x.com/a/status/2"></a></blockquote>' +
        '<blockquote class="imgur-embed-pub" data-id="abc"></blockquote><p>本文</p></body>',
    );
    appendEmbedScripts($);
    expect($('script[src="https://platform.twitter.com/widgets.js"]')).toHaveLength(1);
    expect($('script[src="https://s.imgur.com/min/embed.js"]')).toHaveLength(1);
    expect($('script[src*="instagram.com"]')).toHaveLength(0);
    expect($('script').attr('async')).toBeDefined();
  });

  it('埋め込みが無ければ何も足さない', () => {
    const $ = load('<body><p>本文</p></body>');
    appendEmbedScripts($);
    expect($('script')).toHaveLength(0);
  });
});

// iOSのWKWebViewはiframeの読み込みでもonShouldStartLoadWithRequestを呼ぶため、
// 埋め込みのホストだけを通す判定
describe('isEmbedFrameUrl', () => {
  it.each([
    'https://www.youtube.com/embed/abc?feature=oembed',
    'https://www.youtube-nocookie.com/embed/abc',
    'https://platform.twitter.com/embed/Tweet.html?id=1',
    'https://platform.x.com/embed/Tweet.html?id=1',
    'https://imgur.com/abc/embed?pub=true',
    'https://www.instagram.com/p/abc/embed/',
    'about:blank',
    'about:srcdoc',
  ])('埋め込みホストは許可: %s', (url) => {
    expect(isEmbedFrameUrl(url)).toBe(true);
  });

  it.each([
    'https://news4vip.livedoor.biz/nsq.html',
    'https://richlink.blogsys.jp/embed/abc',
    'https://googleads.g.doubleclick.net/pagead/ads',
    'https://evil-youtube.com/embed/abc',
    'https://youtube.com.evil.example/embed/abc',
    'javascript:alert(1)',
    '',
  ])('それ以外は遮断: %s', (url) => {
    expect(isEmbedFrameUrl(url)).toBe(false);
  });
});
