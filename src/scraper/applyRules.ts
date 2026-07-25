import type { CheerioAPI } from 'cheerio/slim';
import { isTag, isText, type AnyNode, type Element } from 'domhandler';

import { siteRules } from '@/scraper/siteRules';
import type { AnchorCleanup } from '@/scraper/types';

export function applySiteRules($: CheerioAPI, siteTitle: string): void {
  const rule = siteRules[siteTitle];
  if (!rule) {
    return;
  }
  removeAll($, rule.removeSelectors ?? []);
  for (const cleanup of rule.anchorCleanups ?? []) {
    cleanupAnchors($, cleanup);
  }
  if (rule.trimTrailingBrs) {
    trimTrailingBrs($, rule.trimTrailingBrs);
  }
}

function removeAll($: CheerioAPI, selectors: readonly string[]): void {
  for (const selector of selectors) {
    $('body').find(selector).remove();
  }
}

// 対象アンカーと「直後の兄弟<br> n個」を削除する。
// 旧実装の「<br>全体リストのインデックス逆算」(バグ含み)を決定的なロジックに置換
function cleanupAnchors($: CheerioAPI, cleanup: AnchorCleanup): void {
  const anchors = $('body').find(cleanup.selector).toArray();
  for (const anchor of anchors) {
    const href = $(anchor).attr('href');
    if (href === undefined || !cleanup.hrefTest(href)) {
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
