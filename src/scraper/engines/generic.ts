import type { CheerioAPI } from 'cheerio/slim';

import { rebuildHead } from '@/scraper/engines/livedoor';
import type { BlogEngine } from '@/scraper/engines/types';
import type { EngineConfig } from '@/scraper/types';

// 設定駆動の汎用エンジン。livedoor構造を持たないブログ(WordPress/FC2/Seesaa等)を、
// SiteRuleのengine.bodySelectorで本文特定して再構築する。
// テンプレート族ごとに専用エンジンを増やす代わりにセレクタをデータとして持つことで、
// サイト改装時もリモートルール配信だけで追従できる(セレクタ変更にストア審査が不要)
export const genericEngine: BlogEngine = {
  name: 'generic',
  matches: ($, rule) => rule?.engine !== undefined && $(rule.engine.bodySelector).length > 0,
  prepare: ($, _fetchPage, rule) => {
    const config = rule?.engine;
    if (config) {
      rebuildHead($);
      ensureViewport($);
      $('head').append(GENERIC_STYLE);
      rebuildGenericBody($, rule.name, config);
    }
    return Promise.resolve();
  },
};

// 汎用エンジン出力の最低限の体裁。サイトCSSは.app-*クラスを知らないため自前で整える。
// img縮小は、モバイル向けCSSを持たないサイトで画像が画面幅を突き抜けるのを防ぐ保険
const GENERIC_STYLE = [
  '<style>',
  '.app-article{padding:0 12px;}',
  '.app-blog-title{margin:8px 0 0;font-size:12px;color:#888;}',
  '.app-article-title{margin:4px 0 12px;font-size:18px;line-height:1.4;}',
  'div.article-body-outer img{max-width:100%;height:auto;}',
  '</style>',
].join('');

// rebuildHeadは元からあるviewportしか残さないため、PC向けページには存在しないことがある
function ensureViewport($: CheerioAPI): void {
  if ($('head meta[name="viewport"]').length === 0) {
    $('head').append('<meta name="viewport" content="width=device-width, initial-scale=1">');
  }
}

// bodyを「ブログ名+記事タイトル+本文」だけに再構成する(livedoorのrebuildBody相当)。
// 本文ブロックはlivedoorと同じ.article-body-outerで包み、検証・スタイルの扱いを揃える
function rebuildGenericBody($: CheerioAPI, siteName: string, config: EngineConfig): void {
  const bodies = $(config.bodySelector).toArray();
  const title = extractTitle($, config.titleSelector);

  const outer = $('<div class="article-body-outer"></div>');
  for (const body of bodies) {
    outer.append(body);
  }
  // まとめ表示にJSは不要で、広告・計測・レコメンドウィジェットが大半のため一律除去する
  outer.find('script, noscript').remove();

  const article = $('<div class="app-article"></div>');
  article.append(`<p class="app-blog-title">${escapeText(siteName)}</p>`);
  if (title) {
    article.append(`<h1 class="app-article-title">${escapeText(title)}</h1>`);
  }
  article.append(outer);

  const body = $('body');
  body.empty();
  body.append(article);
}

function extractTitle($: CheerioAPI, titleSelector: string | undefined): string | undefined {
  if (!titleSelector) {
    return undefined;
  }
  const text = $(titleSelector).first().text().trim();
  return text === '' ? undefined : text;
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
