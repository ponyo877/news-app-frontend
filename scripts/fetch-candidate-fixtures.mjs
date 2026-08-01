// 追加候補サイト(scripts/candidate-sites.json)の実記事HTMLを取得し、
// テンプレート構造を分類する開発用スクリプト。
//   npm run fetch-candidates
// 保存先: src/scraper/__fixtures__/candidates/<サイト名>.html(gitignore対象)
// 分類結果: src/scraper/__fixtures__/candidates/__classification__.json
// candidateSites.test.ts がこのファイル群を見つけると検証を行う。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { load } from 'cheerio/slim';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'src/scraper/__fixtures__/candidates');
const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';

// livedoorエンジンが依存する構造セレクタ。matches()判定のarticle-bodyだけでなく、
// rebuildBody()が参照する全セレクタが揃わないと再構築後に本文が消えるため全て検査する
const LIVEDOOR_STRUCTURE = [
  'div#article-contents.article-body',
  'div.article-body-outer',
  'header.section-box',
  'div.content',
  'div.container-inner',
  'div.container',
];

// 亜種・他プラットフォームの本文セレクタ候補(分類の手がかり)
const BODY_CANDIDATES = [
  'div.article-body-inner',
  'div.article-body',
  'div#article-body',
  'div.entry-content',
  'div.entry_body',
  'div#entry_body',
  'article',
  'div.post-content',
  'div#main .entry',
];

// ファイル名に使えない文字を置換(ワラノート等の記号入りサイト名対策)
const safeName = (name) => name.replace(/[\\/:*?"<>|]/g, '_');

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// RSSから記事URLを取り出す(RDF/RSS2.0両対応。先頭からn件)
function articleLinksFromRss(xml, count) {
  const links = [];
  const itemRe = /<item[\s>][\s\S]*?<link>([\s\S]*?)<\/link>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null && links.length < count) {
    const link = m[1].trim();
    if (link) links.push(link);
  }
  return links;
}

function classify(html) {
  const $ = load(html);
  const structure = Object.fromEntries(
    LIVEDOOR_STRUCTURE.map((sel) => [sel, $(sel).length]),
  );
  const bodies = Object.fromEntries(
    BODY_CANDIDATES.map((sel) => [sel, $(sel).length]).filter(([, n]) => n > 0),
  );
  const generator = $('meta[name="generator"]').attr('content') ?? '';
  const livedoorReady = LIVEDOOR_STRUCTURE.every((sel) => structure[sel] > 0);
  let family = 'unknown';
  if (livedoorReady) {
    family = 'A:livedoor';
  } else if (structure['div#article-contents.article-body'] > 0) {
    family = 'B:livedoor-partial'; // 本文はあるが再構築用の構造が欠けている
  } else if (/wordpress/i.test(generator) || bodies['div.entry-content']) {
    family = 'C:wordpress';
  } else if (/fc2/i.test(generator) || bodies['div.entry_body'] || bodies['div#entry_body']) {
    family = 'D:fc2';
  }
  return { family, generator, structure, bodies };
}

const { sites } = JSON.parse(
  readFileSync(join(ROOT, 'scripts/candidate-sites.json'), 'utf8'),
);
mkdirSync(OUT_DIR, { recursive: true });

const report = [];
for (const site of sites) {
  const entry = { name: site.name, rssUrl: site.rssUrl };
  try {
    const rss = await fetchText(site.rssUrl);
    const links = articleLinksFromRss(rss, 2);
    if (links.length === 0) throw new Error('RSSに記事が見つからない');
    entry.articles = [];
    for (const [i, link] of links.entries()) {
      const html = await fetchText(link);
      const suffix = i === 0 ? '' : `__${i + 1}`;
      writeFileSync(
        join(OUT_DIR, `${safeName(site.name)}${suffix}.html`),
        `<!-- source: ${link} -->\n${html}`,
      );
      entry.articles.push({ url: link, ...classify(html) });
    }
    entry.family = entry.articles[0].family;
    console.log(`${entry.family.padEnd(20)} ${site.name}`);
  } catch (e) {
    entry.error = e.message;
    console.warn(`ERROR                ${site.name}: ${e.message}`);
  }
  report.push(entry);
}

writeFileSync(
  join(OUT_DIR, '__classification__.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2),
);

const summary = {};
for (const r of report) {
  const key = r.error ? 'ERROR' : r.family;
  summary[key] = (summary[key] ?? 0) + 1;
}
console.log('\n==== 分類サマリ ====');
for (const [family, count] of Object.entries(summary).sort()) {
  console.log(`${family}: ${count}`);
}
