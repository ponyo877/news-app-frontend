import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { applySiteRules } from '@/scraper/applyRules';
import { detectEngine } from '@/scraper/engines';
import { loadDoc } from '@/scraper/htmlLoad';
import { matchSiteRule } from '@/scraper/ruleMatcher';
import { bundledRuleSet } from '@/scraper/rulesStore';
import { serialize, stripLinkHrefs } from '@/scraper/serialize';

// 実サイトHTMLでの検証(P5)。`npm run fetch-fixtures` 実行後にのみ動く。
// テンプレート変更(エンジン非対応化・ルールの風化)を手元で検知するためのテスト。
// DUMP_SCRAPER_OUTPUT=1 で整形結果を __output__/ に書き出す(ブラウザでの目視確認用)
const REAL_DIR = join(__dirname, '../__fixtures__/real');
const OUTPUT_DIR = join(REAL_DIR, '__output__');
const shouldDump = process.env.DUMP_SCRAPER_OUTPUT === '1';

const fixtures = existsSync(REAL_DIR)
  ? readdirSync(REAL_DIR)
      .filter((f) => f.endsWith('.html'))
      .map((f) => ({ name: f.replace(/\.html$/, ''), path: join(REAL_DIR, f) }))
  : [];

const maybeDescribe = fixtures.length > 0 ? describe : describe.skip;

maybeDescribe('実サイトHTML(fetch-fixtures取得分)', () => {
  it.each(fixtures)('$name: 整形パイプラインが機能する', async ({ name, path }) => {
    const html = readFileSync(path, 'utf8');
    const sourceUrl = /<!-- source: (.*?) -->/.exec(html)?.[1] ?? '';
    const $ = loadDoc(html);

    const engine = detectEngine($);
    const rule = matchSiteRule(bundledRuleSet, sourceUrl, name);

    if (!engine) {
      // エンジン非対応サイトは生HTML表示にフォールバックする仕様。
      // ルールが定義されているのにエンジン非対応ならテンプレート大改装の可能性が高い
      expect(rule).toBeUndefined();
      dumpOutput(name, sourceUrl, `<!-- engine未対応: 生HTML表示 -->\n${html}`);
      return;
    }

    await engine.prepare($, () => Promise.reject(new Error('no network in test')));
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
    dumpOutput(name, sourceUrl, output);
  });
});

function dumpOutput(name: string, sourceUrl: string, output: string): void {
  if (!shouldDump) {
    return;
  }
  mkdirSync(OUTPUT_DIR, { recursive: true });
  // ブラウザでの目視確認用に<base>を注入(アプリではWebViewのbaseUrlが同じ役割を担う)。
  // charsetはパイプライン出力に含まれる想定(rebuildHeadで注入)
  const withBase = sourceUrl
    ? output.replace(/<head>/, `<head><base href="${sourceUrl}">`)
    : output;
  writeFileSync(join(OUTPUT_DIR, `${name}.html`), withBase);
}
