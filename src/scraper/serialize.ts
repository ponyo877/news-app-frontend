import type { CheerioAPI } from 'cheerio/slim';

// 全リンクからhrefを剥奪して外部遷移を封じる(全エンジン共通、旧実装と同一)
export function stripLinkHrefs($: CheerioAPI): void {
  $('body a[target]').removeAttr('href');
}

// 旧版はhead.outerHtml + body.outerHtmlを出力していたため同形式にする
export function serialize($: CheerioAPI): string {
  return $('head').toString() + $('body').toString();
}
