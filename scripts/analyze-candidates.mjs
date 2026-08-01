// 候補サイトのフィクスチャHTMLから、本文ブロック内に残るジャンク(広告・レコメンド・目次等)を
// 棚卸しする開発用スクリプト。ルール(removeSelectors)作成の材料にする。
//   node scripts/analyze-candidates.mjs
// 出力: src/scraper/__fixtures__/candidates/__junk__.json と標準出力のサマリ
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { load } from 'cheerio/slim';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'src/scraper/__fixtures__/candidates');

// 汎用エンジン対象サイトの本文セレクタ(defaultRules.jsonのengine設定と揃える)
const GENERIC_BODY = {
  'ガジェット2ch': 'div.entry-content',
  'りぷらい速報': 'div.entry-body',
  '働くモノニュース': 'div.entry_body',
  'ニュー速VIPワイド': 'div.article-body',
  'ネタめし.com': 'div.article__content',
};
const LIVEDOOR_BODY = 'div#article-contents.article-body';

const SUSPICIOUS_ATTR = /ad|sponsor|recommend|related|blogroll|rss|ranking|matome|osusume|ninja|banner|affiliate|amazon|rakuten/i;
const TEXT_MARKERS = ['関連記事', '人気記事', 'おすすめ記事', 'ランキング', '目次', 'この記事も読まれています', 'ブログランキング', '応援クリック'];

const files = readdirSync(DIR).filter((f) => f.endsWith('.html'));
const report = {};
for (const file of files) {
  const site = file.replace(/(__\d+)?\.html$/, '');
  const html = readFileSync(join(DIR, file), 'utf8');
  const $ = load(html);
  const bodySel = GENERIC_BODY[site] ?? LIVEDOOR_BODY;
  const body = $(bodySel).first();
  if (body.length === 0) continue;
  const entry = (report[site] ??= {
    bodySelector: bodySel,
    scriptSrcs: {},
    inlineScriptSigs: {},
    iframes: {},
    insCount: 0,
    suspicious: {},
    textMarkers: {},
  });

  body.find('script[src]').each((_, el) => {
    const src = ($(el).attr('src') ?? '').replace(/^(https?:)?\/\//, '').slice(0, 80);
    entry.scriptSrcs[src] = (entry.scriptSrcs[src] ?? 0) + 1;
  });
  body.find('script:not([src])').each((_, el) => {
    const text = $(el).text().trim();
    const sig = /adstir|gsspcln|adsbygoogle|admax|nend|i-mobile|imobile|fam-8|fluct|zucks|geniee|popin|taboola|outbrain|microad|impact-ad|socdm|irss_conf|blogroll|google\.load|amazon/i.exec(text)?.[0]
      ?? text.slice(0, 30);
    entry.inlineScriptSigs[sig] = (entry.inlineScriptSigs[sig] ?? 0) + 1;
  });
  body.find('iframe').each((_, el) => {
    const src = ($(el).attr('src') ?? '(no-src)').replace(/^(https?:)?\/\//, '').slice(0, 80);
    entry.iframes[src] = (entry.iframes[src] ?? 0) + 1;
  });
  entry.insCount += body.find('ins').length;
  body.find('[class],[id]').each((_, el) => {
    const cls = `${$(el).attr('class') ?? ''} ${$(el).attr('id') ?? ''}`.trim();
    if (SUSPICIOUS_ATTR.test(cls)) {
      const key = `<${el.tagName}> ${cls.slice(0, 60)}`;
      entry.suspicious[key] = (entry.suspicious[key] ?? 0) + 1;
    }
  });
  for (const marker of TEXT_MARKERS) {
    // 本文のテキストノード(script除去後)にマーカーが残るか
    const clone = load(`<div>${body.html() ?? ''}</div>`);
    clone('script,noscript').remove();
    if (clone.text().includes(marker)) {
      entry.textMarkers[marker] = true;
    }
  }
}

writeFileSync(join(DIR, '__junk__.json'), JSON.stringify(report, null, 2));

// サマリ: サイト横断で頻出するジャンク
const agg = {};
for (const [site, e] of Object.entries(report)) {
  for (const key of [
    ...Object.keys(e.scriptSrcs).map((s) => `src:${s.split('/')[0]}`),
    ...Object.keys(e.inlineScriptSigs).map((s) => `inline:${s}`),
    ...Object.keys(e.iframes).map((s) => `iframe:${s.split('/')[0]}`),
  ]) {
    (agg[key] ??= new Set()).add(site);
  }
}
console.log('==== サイト横断のジャンク出現(2サイト以上) ====');
for (const [key, sites] of Object.entries(agg).sort((a, b) => b[1].size - a[1].size)) {
  if (sites.size >= 2) console.log(`${String(sites.size).padStart(3)}  ${key}`);
}
console.log(`\nサイト数: ${Object.keys(report).length} / 詳細: __junk__.json`);
