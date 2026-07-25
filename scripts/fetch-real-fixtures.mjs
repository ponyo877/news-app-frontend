// 対応ブログの実記事HTMLをフィクスチャとして取得する開発用スクリプト(P5)。
//   npm run fetch-fixtures
// 保存先: src/scraper/__fixtures__/real/<サイト名>.html(gitignore対象)
// realSites.test.ts がこのファイル群を見つけるとスナップショット的な検証を行う。
// 定期的に実行すると、サイト側のテンプレート変更(ルールの風化)を手元で検知できる。
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'src/scraper/__fixtures__/real');
const BASE_URL = 'https://matome.folks-chat.com';
const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';

const ruleSet = JSON.parse(readFileSync(join(ROOT, 'src/scraper/defaultRules.json'), 'utf8'));
const targets = new Map(ruleSet.rules.map((r) => [r.name, r]));

function matchRuleName(url) {
  const normalized = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
  for (const rule of ruleSet.rules) {
    if (rule.urlPrefixes.some((p) => normalized.startsWith(p))) {
      return rule.name;
    }
  }
  return null;
}

async function collectArticleUrls() {
  const found = new Map(); // ruleName -> article url
  let cursor = '';
  for (let page = 0; page < 10 && found.size < targets.size; page++) {
    const res = await fetch(
      `${BASE_URL}/v1/article?lastPublishedAt=${encodeURIComponent(cursor)}&skipIDs=`,
    );
    const json = await res.json();
    for (const article of json.data ?? []) {
      const name = article?.url ? matchRuleName(article.url) : null;
      if (name && !found.has(name)) {
        found.set(name, article.url);
      }
    }
    cursor = json.lastPublishedAt ?? '';
    if (!cursor) break;
  }
  return found;
}

const urls = await collectArticleUrls();
mkdirSync(OUT_DIR, { recursive: true });
for (const [name, url] of urls) {
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
const missing = [...targets.keys()].filter((name) => !urls.has(name));
if (missing.length > 0) {
  console.warn(`記事が見つからなかったサイト: ${missing.join(', ')}`);
}
