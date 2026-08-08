// 共有URLとカスタムスキームから記事IDを取り出す。
// https://matome.folks-chat.com/a/{uuid}(Universal Links / App Links)と
// matomekun://a/{uuid}(着地ページの「アプリで開く」)の両対応
const ARTICLE_LINK_RE =
  /^(?:https:\/\/matome\.folks-chat\.com|matomekun:\/)\/a\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(?:[/?#]|$)/;

export function parseArticleLink(url: string | null): string | null {
  if (!url) {
    return null;
  }
  const match = ARTICLE_LINK_RE.exec(url);
  return match?.[1] ? match[1].toLowerCase() : null;
}
