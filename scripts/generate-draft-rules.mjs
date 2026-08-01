// __junk__.json(本文内ジャンクの棚卸し)から defaultRules.json v3 のドラフトを生成する。
//   node scripts/generate-draft-rules.mjs > /tmp/draft-rules.json
// 方針: フィクスチャで実際に観測されたジャンクだけをセレクタ化する(過剰な共通ルールで
// reportSelectorMissの風化検知を無意味にしない)。汎用エンジン5サイトと既存ルールは
// このドラフトを土台に手で仕上げる。
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'src/scraper/__fixtures__/candidates');

const junk = JSON.parse(readFileSync(join(DIR, '__junk__.json'), 'utf8'));
const { report } = JSON.parse(readFileSync(join(DIR, '__classification__.json'), 'utf8'));
const { sites } = JSON.parse(readFileSync(join(ROOT, 'scripts/candidate-sites.json'), 'utf8'));

// 観測されたジャンク署名 → removeSelector のマッピング
const SRC_SELECTORS = [
  ['ad-stir.com', 'script[src*="ad-stir.com"]'],
  ['googlesyndication.com', 'script[src*="googlesyndication.com"]'],
  ['img-c.net', 'script[src*="img-c.net"]'],
  ['dameparts.com', 'script[src*="dameparts.com"]'],
  ['permalink-system.com', 'script[src*="permalink-system.com"]'],
  ['matomeantena.com', 'script[src*="matomeantena.com"]'],
  ['rcm.shinobi.jp', 'script[src*="rcm.shinobi.jp"]'],
  ['i-mobile.co.jp', 'script[src*="i-mobile.co.jp"]'],
  ['matome.xvps.jp', 'script[src*="matome.xvps.jp"]'],
  ['blogroll.livedoor.net', 'script[src*="blogroll.livedoor.net"]'],
];
const INLINE_SELECTORS = [
  ['adstir', 'script:contains("adstir")'],
  ['gsspcln', 'script:contains("gsspcln")'],
  ['adsbygoogle', 'script:contains("adsbygoogle")'],
  ['irss_conf', 'script:contains("irss_conf")'],
  ['c_img_param', 'script:contains("c_img_param")'],
  ['in_article_cd', 'script:contains("in_article_cd")'],
  ['imobile', 'script:contains("imobile")'],
  ['blogroll', 'script:contains("blogroll")'],
];
const IFRAME_SELECTORS = [['richlink.blogsys.jp', 'iframe[src*="richlink.blogsys.jp"]']];

// 汎用エンジンサイト(エンジンがscript/noscriptを一律除去するためscript系セレクタは不要)
const GENERIC = new Set(['ガジェット2ch', 'りぷらい速報', '働くモノニュース', 'ニュー速VIPワイド', 'ネタめし.com']);

// blog.livedoor.jpは複数ブログが同居する共有ホストのためパスまで含めて区別する。
// それ以外はホスト単位(サブドメインでブログが分かれる)
const urlPrefix = (url) => {
  const stripped = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
  const shared = /^(blog\.livedoor\.jp\/[^/]+\/)/.exec(stripped);
  if (shared) {
    return shared[1];
  }
  return stripped.replace(/^([^/]+\/).*$/, '$1');
};

const rules = [];
for (const site of sites) {
  const e = junk[site.name];
  const r = report.find((x) => x.name === site.name);
  if (!e || !r?.articles?.length) {
    rules.push({ name: site.name, TODO: 'フィクスチャなし' });
    continue;
  }
  const prefixes = new Set(r.articles.map((a) => urlPrefix(a.url)));
  prefixes.add(urlPrefix(site.blogUrl));
  const rule = {
    name: site.name,
    urlPrefixes: [...prefixes],
    siteTitles: [site.existingTitle ?? site.name],
  };
  const selectors = new Set();
  if (!GENERIC.has(site.name)) {
    for (const [sig, sel] of SRC_SELECTORS) {
      if (Object.keys(e.scriptSrcs).some((s) => s.includes(sig))) selectors.add(sel);
    }
    for (const [sig, sel] of INLINE_SELECTORS) {
      if (Object.keys(e.inlineScriptSigs).some((s) => s.toLowerCase().includes(sig))) selectors.add(sel);
    }
  }
  for (const [sig, sel] of IFRAME_SELECTORS) {
    if (Object.keys(e.iframes).some((s) => s.includes(sig))) selectors.add(sel);
  }
  if (Object.keys(e.inlineScriptSigs).some((s) => s.toLowerCase().includes('adsbygoogle')) || e.insCount > 0) {
    selectors.add('ins.adsbygoogle');
  }
  if (selectors.size > 0) rule.removeSelectors = [...selectors];
  // 手で確認すべき残り物をメモとして付ける(最終JSONからは削除する)
  const memo = {};
  if (Object.keys(e.suspicious).length) memo.suspicious = e.suspicious;
  if (Object.keys(e.textMarkers).length) memo.textMarkers = Object.keys(e.textMarkers);
  const knownIframes = Object.keys(e.iframes).filter(
    (s) => !/youtube|richlink/.test(s),
  );
  if (knownIframes.length) memo.iframes = knownIframes;
  const unknownInline = Object.keys(e.inlineScriptSigs).filter(
    (s) => !INLINE_SELECTORS.some(([sig]) => s.toLowerCase().includes(sig)),
  );
  if (unknownInline.length) memo.unknownInline = unknownInline;
  const unknownSrc = Object.keys(e.scriptSrcs).filter(
    (s) => !SRC_SELECTORS.some(([sig]) => s.includes(sig)) && !/twitter|platform\.x|imgur|instagram/.test(s),
  );
  if (unknownSrc.length) memo.unknownSrc = unknownSrc;
  if (Object.keys(memo).length) rule.MEMO = memo;
  rules.push(rule);
}
console.log(JSON.stringify({ version: 3, rules }, null, 2));
