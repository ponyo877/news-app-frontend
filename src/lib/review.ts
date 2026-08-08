import * as StoreReview from 'expo-store-review';

import { logEvent, logError } from '@/lib/analytics';
import { useArticleStatusStore } from '@/stores/articleStatusStore';
import { useReviewStore } from '@/stores/reviewStore';

// ストアレビュー依頼(GROWTH-PLAN §4-3)。
// トリガー: 記事10本読了 + インストール3日後 の好機に1回だけ。
// 両OSとも「実際に表示されたか」はAPIから分からないため、
// 「1回だけ」= requestReviewを1回だけ呼ぶ、と定義する(requestedAtで担保)

export const REVIEW_READ_COUNT = 10;
export const REVIEW_MIN_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

// 判定は純関数(テスト対象)
export function shouldRequestReview(args: {
  readCount: number;
  installAt: number | null;
  requestedAt: number | null;
  now: number;
}): boolean {
  const { readCount, installAt, requestedAt, now } = args;
  return (
    requestedAt === null &&
    readCount >= REVIEW_READ_COUNT &&
    installAt !== null &&
    now - installAt >= REVIEW_MIN_DAYS * DAY_MS
  );
}

// 条件を満たしていればOSのレビューダイアログを要求する。
// iOS: 表示するかはOSが決める(365日3回上限)。Android: Playのクォータで無言のことがある
export async function maybeRequestStoreReview(): Promise<void> {
  const review = useReviewStore.getState();
  const readCount = Object.keys(useArticleStatusStore.getState().readIds).length;
  if (
    !shouldRequestReview({
      readCount,
      installAt: review.installAt,
      requestedAt: review.requestedAt,
      now: Date.now(),
    })
  ) {
    return;
  }
  // 成否不問で消費扱い(表示確認が不可能なため)
  review.markRequested();
  try {
    if (await StoreReview.isAvailableAsync()) {
      logEvent('review_prompt', { read_count: readCount });
      await StoreReview.requestReview();
    }
  } catch (error) {
    logError(error, 'requestStoreReview');
  }
}
