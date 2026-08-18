import type { CheerioAPI } from 'cheerio/slim';
import { isTag, isText, type AnyNode, type Element } from 'domhandler';

import { reportSelectorMiss } from '@/scraper/ruleStats';
import type { AnchorCleanupRule, SiteRule } from '@/scraper/types';

// 全サイト共通で落とす、ブログサービス由来のナビゲーション部品。
//
// 【AdMobポリシー対応】本文中のリンクはすべて無効化しているため、
// 「押せそうに見えて何も起きない」誘導ボタンやリンク集が残っていると
// 「サイトの動作: ナビゲーション」の *存在しないコンテンツにリンクしている*
// に該当する。サイト個別ではなくブログサービス共通のパーツなので、
// defaultRules.json ではなくここで一括して落とす
const COMMON_REMOVE_SELECTORS = [
  // 本文に残ったJSはWebView(javaScriptEnabled)で実行され、除去したはずの
  // 広告やアンテナのリンク集をその場で描き直してしまう。
  // 整形結果に対する後付けの改変を止めるため、本文のJSは一律で落とす
  // (汎用エンジンは engines/generic.ts で同じことをしている)。
  // まとめ表示にJSは不要で、残っているのは広告・計測・レコメンドが大半
  'script',
  'noscript',
  // livedoor Blogの「ライブドアアプリでフォローする」誘導(126/140フィクスチャに存在)
  'div.ldapp-article',
  // Bp2アンテナ自動投稿ツールが記事末尾に差し込む、外部アンテナサイトへのリンク集
  'a.Bp2ArchiveOne',
  '#ArchivePowerdByBottom',
  '#Bp2I2iSpTag',
  '#Bp2ArchiveAdsafe',
  '#Bp2ArchiveTitleText',
];

// サイトルールと違い、無い方が普通なのでreportSelectorMissは呼ばない
export function applyCommonRules($: CheerioAPI): void {
  for (const selector of COMMON_REMOVE_SELECTORS) {
    $('body').find(selector).remove();
  }
}

// マッチ済みのサイトルールを適用する。ルールは完全なデータ(関数なし)なので
// リモート配信されたものでもそのまま実行できる
export function applySiteRules($: CheerioAPI, rule: SiteRule): void {
  removeAll($, rule);
  for (const cleanup of rule.anchorCleanups ?? []) {
    cleanupAnchors($, rule, cleanup);
  }
  if (rule.trimTrailingBrs) {
    trimTrailingBrs($, rule.trimTrailingBrs);
  }
}

function removeAll($: CheerioAPI, rule: SiteRule): void {
  for (const selector of rule.removeSelectors ?? []) {
    const matched = $('body').find(selector);
    if (matched.length === 0) {
      reportSelectorMiss(rule.name, selector);
      continue;
    }
    matched.remove();
  }
}

// hrefPrefix / hrefNotPrefix によるアンカー削除判定(旧hrefTest関数の宣言化)
function shouldRemoveAnchor(href: string, cleanup: AnchorCleanupRule): boolean {
  if (cleanup.hrefPrefix !== undefined) {
    return href.startsWith(cleanup.hrefPrefix);
  }
  if (cleanup.hrefNotPrefix !== undefined) {
    return !href.startsWith(cleanup.hrefNotPrefix);
  }
  return false;
}

// 対象アンカーと「直後の兄弟<br> n個」を削除する
function cleanupAnchors($: CheerioAPI, rule: SiteRule, cleanup: AnchorCleanupRule): void {
  const anchors = $('body').find(cleanup.selector).toArray();
  if (anchors.length === 0) {
    reportSelectorMiss(rule.name, cleanup.selector);
    return;
  }
  for (const anchor of anchors) {
    const href = $(anchor).attr('href');
    if (href === undefined || !shouldRemoveAnchor(href, cleanup)) {
      continue;
    }
    removeFollowingBrs($, anchor, cleanup.trailingBr);
    $(anchor).remove();
  }
}

function removeFollowingBrs($: CheerioAPI, anchor: Element, count: number): void {
  let removed = 0;
  let node: AnyNode | null = anchor.nextSibling;
  while (node && removed < count) {
    const next: AnyNode | null = node.nextSibling;
    if (isBrElement(node)) {
      $(node).remove();
      removed += 1;
    } else if (!isWhitespaceText(node)) {
      break; // <br>以外の実要素が現れたら打ち切り
    }
    node = next;
  }
}

function isBrElement(node: AnyNode): node is Element {
  return isTag(node) && node.tagName === 'br';
}

function isWhitespaceText(node: AnyNode): boolean {
  return isText(node) && node.data.trim() === '';
}

// body末尾から<br>をn個削除する
function trimTrailingBrs($: CheerioAPI, count: number): void {
  const brs = $('body').find('br').toArray();
  for (const br of brs.slice(-count)) {
    $(br).remove();
  }
}
