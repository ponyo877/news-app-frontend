// 一覧(FlashList)に差し込むインフィード広告のスロット計算。
//
// 記事画面の最下部バナーはAdMobに「ナビゲーションと誤認する配置」として
// ポリシー違反を指摘されたため撤去し、収益源を一覧のインフィードへ移した。
// 一覧の広告はスクロールで流れるためタブバー位置に固定されず、
// 上下の記事カードとはFeedAdCard側の余白・区切り線・ラベルで分離する。

// ファーストビューは純粋なコンテンツにする(先頭この件数までは広告を出さない)
const LEAD_ARTICLES = 3;
// 以降この件数ごとに広告を1枠挿入する
const AD_INTERVAL = 6;

export type FeedEntry<T> =
  | {
      type: 'article';
      key: string;
      article: T;
      // 広告挿入で位置がずれるため、元配列での位置を保持する。
      // ランキングの順位表示(PopularListのrenderLeading)がこれに依存する
      index: number;
    }
  | { type: 'ad'; key: string };

/**
 * 記事配列に広告スロットを差し込んだ配列を返す。
 *
 * 末尾に広告が来ないようにする(リストの最後は必ず記事)。
 * これは「続きがある」と誤認させないため、かつ無限スクロールの
 * ローディング表示と広告が隣接しないようにするため。
 */
export function withFeedAds<T>(
  articles: readonly T[],
  keyOf: (article: T, index: number) => string,
): FeedEntry<T>[] {
  const entries: FeedEntry<T>[] = [];

  articles.forEach((article, index) => {
    // 先頭LEAD_ARTICLES件を過ぎたあと、AD_INTERVAL件ごとの区切りに広告を置く。
    // 「この記事の手前」に挿入するので、末尾が広告になることはない
    const isSlot = index >= LEAD_ARTICLES && (index - LEAD_ARTICLES) % AD_INTERVAL === 0;
    if (isSlot) {
      entries.push({ type: 'ad', key: `ad-${index}` });
    }
    entries.push({ type: 'article', key: keyOf(article, index), article, index });
  });

  return entries;
}
