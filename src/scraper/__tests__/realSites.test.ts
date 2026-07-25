import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { applySiteRules } from '@/scraper/applyRules';
import { detectEngine } from '@/scraper/engines';
import { livedoorEngine } from '@/scraper/engines/livedoor';
import { loadDoc } from '@/scraper/htmlLoad';
import { matchSiteRule } from '@/scraper/ruleMatcher';
import { bundledRuleSet } from '@/scraper/rulesStore';
import { serialize, stripLinkHrefs } from '@/scraper/serialize';

// 実サイトHTMLでの検証(P5)。`npm run fetch-fixtures` 実行後にのみ動く。
// テンプレート変更(エンジン非対応化・ルールの風化)を手元で検知するためのテスト
const REAL_DIR = join(__dirname, '../__fixtures__/real');

const fixtures = existsSync(REAL_DIR)
  ? readdirSync(REAL_DIR)
      .filter((f) => f.endsWith('.html'))
      .map((f) => ({ name: f.replace(/\.html$/, ''), path: join(REAL_DIR, f) }))
  : [];

const maybeDescribe = fixtures.length > 0 ? describe : describe.skip;

maybeDescribe('実サイトHTML(fetch-fixtures取得分)', () => {
  it.each(fixtures)('$name: エンジン検出と整形が成功する', async ({ name, path }) => {
    const html = readFileSync(path, 'utf8');
    const sourceUrl = /<!-- source: (.*?) -->/.exec(html)?.[1] ?? '';
    const $ = loadDoc(html);

    // livedoorエンジンで処理できる構造か(テンプレート大改装の検知)
    expect(detectEngine($)?.name).toBe('livedoor');

    await livedoorEngine.prepare($, () => Promise.reject(new Error('no network in test')));
    const rule = matchSiteRule(bundledRuleSet, sourceUrl, name);
    expect(rule?.name).toBe(name);

    if (rule) {
      applySiteRules($, rule);
    }
    stripLinkHrefs($);
    const output = serialize($);

    // 本文が残っていること
    expect($('div.article-body-outer').text().trim().length).toBeGreaterThan(0);
    // 除去対象セレクタが出力に残っていないこと
    for (const selector of rule?.removeSelectors ?? []) {
      expect($(selector)).toHaveLength(0);
    }
    expect(output.length).toBeGreaterThan(0);
  });
});
