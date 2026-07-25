import type { SiteRule } from '@/scraper/types';

// 旧webview_tools.dartのサイト別switch分岐を宣言的データに変換したもの。
// セレクタは旧実装から逐語的に移植(現物検証済み)。
const VIPPER_ARCHIVE_PREFIX = 'http://blog.livedoor.jp/news23vip/archives/';
const WARANOTE_IMAGE_PREFIX = 'https://livedoor.blogimg.jp/waranote2/imgs/';

export const siteRules: Record<string, SiteRule> = {
  ニュー速クオリティ: {
    removeSelectors: [
      'script[src="https://blogroll.livedoor.net/js/blogroll.js"]',
      'div#f984a',
    ],
  },
  暇人速報: {
    removeSelectors: [
      'div.article_mid_v2',
      'div#article_low_v2',
      'iframe',
      'span[style="color: #CC0033; font-weight: bold; font-size: 16px;"]',
      'span[style="color: #CC0033; font-weight: bold; font-size: 16px; background-color: #e6e6fa;"]',
      'img[src="http://himasoku.com/parts/ichiosi.png"]',
    ],
  },
  稲妻速報: {
    removeSelectors: ['div.ika2', 'ul#anop', 'ul.inc'],
  },
  哲学ニュース: {
    removeSelectors: [
      'span[style="font-size: large;"]',
      'span[style="font-size: 150%;"]',
      'blockquote',
    ],
  },
  VIPPERな俺: {
    anchorCleanups: [
      {
        selector: 'a[href]',
        hrefTest: (href) => href.startsWith(VIPPER_ARCHIVE_PREFIX),
        trailingBr: 1,
      },
    ],
  },
  ワラノート: {
    removeSelectors: ['div.amazon.Default', 'span[style="color:#006600"]'],
    anchorCleanups: [
      {
        selector: 'a[href][title]:not([class])',
        hrefTest: (href) => !href.startsWith(WARANOTE_IMAGE_PREFIX),
        trailingBr: 2,
      },
      {
        selector: 'a[href][target="_blank"]:not([class])',
        hrefTest: (href) => !href.startsWith(WARANOTE_IMAGE_PREFIX),
        trailingBr: 2,
      },
    ],
    trimTrailingBrs: 6,
  },
};
