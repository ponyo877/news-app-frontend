import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { applyCommonRules, applySiteRules } from '@/scraper/applyRules';
import { detectEngine } from '@/scraper/engines';
import { ARTICLE_BODY_SELECTOR } from '@/scraper/engines/livedoor';
import { loadDoc } from '@/scraper/htmlLoad';
import { matchSiteRule } from '@/scraper/ruleMatcher';
import { bundledRuleSet } from '@/scraper/rulesStore';
import { serialize, stripLinkHrefs } from '@/scraper/serialize';
import { countEmbeds, expectedEmbedScripts } from '@/scraper/__fixtures__/embedCounts';

// 追加候補サイトの検証。`npm run fetch-candidates` 実行後にのみ動く。
// realSites.test.ts より厳しく、全フィクスチャに対して
// 「ルールが存在し・エンジンで整形でき・広告/レコメンドが残らない」ことを要求する。
// (候補サイトはこの検証を通してからDB登録=ユーザ公開されるため)
const CANDIDATE_DIR = join(__dirname, '../__fixtures__/candidates');
// DUMP_SCRAPER_OUTPUT=1 で整形結果を __output__/ に書き出す(realSites.test.tsと同じ仕組み)
const OUTPUT_DIR = join(CANDIDATE_DIR, '__output__');
const shouldDump = process.env.DUMP_SCRAPER_OUTPUT === '1';

// 出力に残ってはいけない要素(全サイト共通)
const FORBIDDEN_SELECTORS = ['div.ninja-recommend-block', 'div.amazon', 'ins', 'noscript iframe'];

// 残存script/iframeを広告・レコメンドと判定する署名
const AD_SIGNATURE =
  /adstir|gsspcln|adsbygoogle|googlesyndication|ad-stir|adingo|fluct|i-mobile|imobile|zucks|ad-spire|gssprt|blozoo|blzP=|dmm\.co|rakuten_design|plist_max_view|pbanner_max_view|irss_conf|c_img_param|in_article_cd|blogroll|matomeantena|rcm\.shinobi|dameparts|permalink-system|img-c\.net|matome\.xvps|solty\.biz|lamp-shade|i2i\.jp|adsenselite|kijisitaset|document\.write\(decodeURIComponent|widget-view\.dmm/i;

// 残存iframeとして許容するもの(動画等のコンテンツ埋め込み)
const IFRAME_ALLOWLIST = /youtube\.com|youtu\.be/;

const fixtures = existsSync(CANDIDATE_DIR)
  ? readdirSync(CANDIDATE_DIR)
      .filter((f) => f.endsWith('.html'))
      .map((f) => ({ name: f.replace(/\.html$/, ''), path: join(CANDIDATE_DIR, f) }))
  : [];

const maybeDescribe = fixtures.length > 0 ? describe : describe.skip;

maybeDescribe('候補サイトHTML(fetch-candidates取得分)', () => {
  it.each(fixtures)('$name: ルールあり・整形でき・広告が残らない', async ({ name, path }) => {
    const html = readFileSync(path, 'utf8');
    const sourceUrl = /<!-- source: (.*?) -->/.exec(html)?.[1] ?? '';
    const $ = loadDoc(html);

    const rule = matchSiteRule(bundledRuleSet, sourceUrl, name.replace(/__\d+$/, ''));
    expect(rule).toBeDefined();

    const engine = detectEngine($, rule);
    expect(engine).toBeDefined();

    // 原文の本文にある埋め込み(整形で減ってはいけない)
    const bodySelector = rule!.engine?.bodySelector ?? ARTICLE_BODY_SELECTOR;
    const embedsBefore = countEmbeds($, $(bodySelector));

    // scrapeArticleと同じ順序
    await engine!.prepare($, () => Promise.reject(new Error('no network in test')), rule);
    applySiteRules($, rule!);
    applyCommonRules($);
    stripLinkHrefs($);
    const output = serialize($, { url: sourceUrl, siteName: name });
    if (shouldDump) {
      mkdirSync(OUTPUT_DIR, { recursive: true });
      const withBase = sourceUrl
        ? output.replace(/<head>/, `<head><base href="${sourceUrl}">`)
        : output;
      writeFileSync(join(OUTPUT_DIR, `${name}.html`), withBase);
    }

    // 本文が残っていること
    expect($('div.article-body-outer').text().trim().length).toBeGreaterThan(0);

    // 埋め込み(Xポスト・imgur・Instagram・YouTube)が原文の本文と同数残り、
    // 描画スクリプトが種類ごとに1本あること(1.51で空白になった回帰の検知)
    expect(countEmbeds($, $('div.article-body-outer'))).toEqual(embedsBefore);
    for (const src of expectedEmbedScripts(embedsBefore)) {
      expect($(`body script[src="${src}"]`)).toHaveLength(1);
    }

    // 除去対象セレクタが残っていないこと
    for (const selector of rule!.removeSelectors ?? []) {
      expect($(`body ${selector}`)).toHaveLength(0);
    }
    // 共通の禁止要素が残っていないこと
    for (const selector of FORBIDDEN_SELECTORS) {
      const matched = $('body').find(selector);
      expect(`${selector}: ${matched.length}`).toBe(`${selector}: 0`);
    }
    // 広告署名を持つscript/iframeが残っていないこと
    const badScripts: string[] = [];
    $('body script').each((_, el) => {
      const src = $(el).attr('src') ?? '';
      const text = $(el).text();
      if (AD_SIGNATURE.test(src) || AD_SIGNATURE.test(text)) {
        badScripts.push(src || text.slice(0, 60));
      }
    });
    expect(badScripts).toEqual([]);
    const badIframes: string[] = [];
    $('body iframe').each((_, el) => {
      const src = $(el).attr('src') ?? '(no-src)';
      if (!IFRAME_ALLOWLIST.test(src)) {
        badIframes.push(src);
      }
    });
    expect(badIframes).toEqual([]);
  });
});
