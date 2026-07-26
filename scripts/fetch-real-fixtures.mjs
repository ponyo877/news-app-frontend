// 対応ブログの実記事HTMLをフィクスチャとして取得する開発用スクリプト(P5)。
//   npm run fetch-fixtures
// 保存先: src/scraper/__fixtures__/real/<サイト名>.html(gitignore対象)
// realSites.test.ts がこのファイル群を見つけると検証を行う。
// 取得戦略: APIの新着フィード→見つからないサイトは各ブログのRSS(index.rdf)から直接取得。
// ルール未定義サイト(痛いニュース等)も含む全サイトを対象にする
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'src/scraper/__fixtures__/real');
const BASE_URL = 'https://matome.folks-chat.com';
const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';

async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

// 新着フィードからサイトごとの記事URLを探す
async function collectFromFeed(siteTitles, found) {
  let cursor = '';
  for (let page = 0; page < 15 && found.size < siteTitles.size; page++) {
    const json = await fetchJson(
      `${BASE_URL}/v1/article?lastPublishedAt=${encodeURIComponent(cursor)}&skipIDs=`,
    );
    for (const article of json.data ?? []) {
      const title = article?.sitetitle;
      if (title && siteTitles.has(title) && !found.has(title) && article.url) {
        found.set(title, article.url);
      }
    }
    cursor = json.lastPublishedAt ?? '';
    if (!cursor) break;
  }
}

// RSS(index.rdf)から最初の記事URLを取る(フィードに出てこないサイトの保険)
async function firstLinkFromRss(rssUrl) {
  try {
    const res = await fetch(rssUrl, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const xml = await res.text();
    // <item>内の<link>を優先。RDF形式(<item rdf:about>)にも対応
    const item = /<item[\s>][\s\S]*?<link>([\s\S]*?)<\/link>/.exec(xml);
    return item?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

const sites = (await fetchJson(`${BASE_URL}/v1/site`)).data ?? [];
const siteTitles = new Set(sites.map((s) => s.titles));
const found = new Map();

await collectFromFeed(siteTitles, found);
for (const site of sites) {
  if (!found.has(site.titles)) {
    const link = await firstLinkFromRss(site.url);
    if (link) found.set(site.titles, link);
  }
}

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, url] of found) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) {
      console.warn(`skip ${name}: HTTP ${res.status} (${url})`);
      continue;
    }
    const html = await res.text();
    writeFileSync(join(OUT_DIR, `${name}.html`), `<!-- source: ${url} -->\n${html}`);
    console.log(`saved: ${name} ← ${url}`);
  } catch (e) {
    console.warn(`skip ${name}: ${e.message}`);
  }
}
const missing = [...siteTitles].filter((name) => !found.has(name));
if (missing.length > 0) {
  console.warn(`記事が見つからなかったサイト: ${missing.join(', ')}`);
}
