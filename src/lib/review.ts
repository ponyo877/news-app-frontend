import * as StoreReview from 'expo-store-review';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { logEvent, logError } from '@/lib/analytics';
import { useArticleStatusStore } from '@/stores/articleStatusStore';
import { useReviewStore } from '@/stores/reviewStore';

// ストアレビュー依頼(GROWTH-PLAN §4-3)。
//
// 「良い評価をもらえそうな瞬間」にだけ聞く:
//   tts_complete … 読み上げを最後まで聴き終えた(本文を最後まで消費した=満足のサイン)
//   favorite     … 記事をお気に入りに入れた(また読みたいと思った)
//   return       … 記事を読んで一覧に戻った(従来のトリガー。既読が多い人向け)
// 出さない条件(ガード):
//   インストール3日未満 / 利用日3日未満 / 既読が少ない / 直近に「表示の不具合を報告」をした /
//   このセッションで記事の取得エラーを見た / 前回依頼から90日未満 / 直近1年に3回依頼済み(Apple の上限と同じ) /
//   iOS で「評価する」を押したことがある
// 文言:
//   iOS はひとこと添えたカード(事実だけ。「5つ星」「高評価」の要求はしない)→「評価する」で OS のダイアログ。
//   Android は Play In-App Review のガイドラインで事前の質問文・誘導文が禁止なので、OS のカードを直接出す。
// 両OSとも「実際に表示されたか」は API から分からないため、依頼した回数だけを数える。

export type ReviewTrigger = 'tts_complete' | 'favorite' | 'return';

export const REVIEW_MIN_DAYS = 3;
export const REVIEW_MIN_ACTIVE_DAYS = 3;
export const REVIEW_MIN_READS: Record<ReviewTrigger, number> = {
  tts_complete: 5,
  favorite: 5,
  return: 10,
};
export const REVIEW_COOLDOWN_DAYS = 90;
export const REVIEW_MAX_PER_YEAR = 3;
export const REVIEW_NEGATIVE_QUIET_DAYS = 14;
// 読み上げ完了を「聴き終えた」とみなす最小セグメント数(数行の記事では判定しない)
export const REVIEW_TTS_MIN_SEGMENTS = 5;
// カードを出す前に置く間。お気に入りはアクションシートの上から、読み上げは再生バーの上から出るので、
// 直前の操作の描画を済ませてから重ねる
export const REVIEW_PROMPT_DELAY_MS = 700;

const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * DAY_MS;

export interface ReviewPromptInput {
  trigger: ReviewTrigger;
  readCount: number;
  activeDayCount: number;
  installAt: number | null;
  promptedAt: number[];
  ratedAt: number | null;
  lastNegativeAt: number | null;
  sessionHadError: boolean;
  now: number;
}

// 判定は純関数(テスト対象)
export function evaluateReviewPrompt(input: ReviewPromptInput): boolean {
  const {
    trigger,
    readCount,
    activeDayCount,
    installAt,
    promptedAt,
    ratedAt,
    lastNegativeAt,
    sessionHadError,
    now,
  } = input;
  if (ratedAt !== null || sessionHadError) {
    return false;
  }
  if (installAt === null || now - installAt < REVIEW_MIN_DAYS * DAY_MS) {
    return false;
  }
  if (activeDayCount < REVIEW_MIN_ACTIVE_DAYS || readCount < REVIEW_MIN_READS[trigger]) {
    return false;
  }
  if (lastNegativeAt !== null && now - lastNegativeAt < REVIEW_NEGATIVE_QUIET_DAYS * DAY_MS) {
    return false;
  }
  const recent = promptedAt.filter((t) => now - t < YEAR_MS);
  if (recent.length >= REVIEW_MAX_PER_YEAR) {
    return false;
  }
  const last = recent.length ? Math.max(...recent) : null;
  return last === null || now - last >= REVIEW_COOLDOWN_DAYS * DAY_MS;
}

// iOS のカードの文言。書くのは事実だけ(感謝・個人開発であること・評価が励みになること)。
// 「5つ星を」「高評価を」とは書かない(誘導は規約に触れるうえ、低評価の人にも刺さらない)
export function reviewPromptCopy(
  trigger: ReviewTrigger,
  activeDayCount: number,
): { title: string; message: string } {
  const message =
    'まとめくんは個人で開発しています。App Store での評価が、次の改善を続ける励みになります。よければ評価をお願いします。';
  switch (trigger) {
    case 'tts_complete':
      return { title: '最後まで聴いていただき、ありがとうございます', message };
    case 'favorite':
      return { title: 'お気に入りに追加していただき、ありがとうございます', message };
    case 'return':
      return { title: `${activeDayCount}日ご利用いただき、ありがとうございます`, message };
  }
}

// 'YYYY-MM-DD'(端末ローカル)。利用日のカウント用
export function localDayKey(now: number): string {
  const d = new Date(now);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ---- セッション状態(プロセス内) ---------------------------------------------
let sessionHadError = false;

// 記事の取得に失敗した画面を見せた直後に評価を聞かない
export function markSessionError(): void {
  sessionHadError = true;
}

// フォアグラウンド復帰で仕切り直す
export function beginSession(now = Date.now()): void {
  sessionHadError = false;
  useReviewStore.getState().noteActiveDay(localDayKey(now));
}

// ---- iOS のカード(RootNavigator が描画する) ----------------------------------
interface ReviewPromptUiState {
  pending: ReviewTrigger | null;
  show: (trigger: ReviewTrigger) => void;
  hide: () => void;
}

export const useReviewPromptUi = create<ReviewPromptUiState>()((set) => ({
  pending: null,
  show: (trigger) => set({ pending: trigger }),
  hide: () => set({ pending: null }),
}));

function isEligible(trigger: ReviewTrigger, now: number): boolean {
  const review = useReviewStore.getState();
  return evaluateReviewPrompt({
    trigger,
    readCount: Object.keys(useArticleStatusStore.getState().readIds).length,
    activeDayCount: review.activeDays.length,
    installAt: review.installAt,
    promptedAt: review.promptedAt,
    ratedAt: review.ratedAt,
    lastNegativeAt: review.lastNegativeAt,
    sessionHadError,
    now,
  });
}

// OS のレビュー UI を要求する。iOS は出すかどうかを OS が決める(365日3回上限)。
// Android は Play のクォータで無言のことがある
async function requestOsReview(trigger: ReviewTrigger, action: 'request' | 'accept'): Promise<void> {
  try {
    if (await StoreReview.isAvailableAsync()) {
      logEvent('review_prompt', { trigger, action });
      await StoreReview.requestReview();
    }
  } catch (error) {
    logError(error, 'requestStoreReview');
  }
}

// 動作確認用: 開発ビルドで EXPO_PUBLIC_REVIEW_PROMPT_DEBUG=1 を付けて metro を起動すると、
// ガードを飛ばして好機のたびに出す(release ビルドでは __DEV__ が false なので無効)
const DEBUG_FORCE = __DEV__ && process.env.EXPO_PUBLIC_REVIEW_PROMPT_DEBUG === '1';

// 好機のサイン。条件を満たしていれば iOS はカード、Android は OS のカードを出す
export function notePositiveSignal(trigger: ReviewTrigger): void {
  const now = Date.now();
  const eligible = DEBUG_FORCE || isEligible(trigger, now);
  if (__DEV__) {
    console.log(`[review] ${trigger}: ${eligible ? '依頼する' : '条件未達'}`);
  }
  if (!eligible || useReviewPromptUi.getState().pending !== null) {
    return;
  }
  // 依頼した時点で消費扱い(表示確認が不可能なため)
  useReviewStore.getState().notePrompted(now);
  setTimeout(() => {
    if (Platform.OS === 'ios') {
      logEvent('review_prompt', { trigger, action: 'show' });
      useReviewPromptUi.getState().show(trigger);
    } else {
      void requestOsReview(trigger, 'request');
    }
  }, REVIEW_PROMPT_DELAY_MS);
}

// 不満のサイン(表示の不具合報告など)。しばらく依頼しない
export function noteNegativeSignal(): void {
  useReviewStore.getState().noteNegative(Date.now());
}

// iOS カードの「評価する」
export function acceptReviewPrompt(): void {
  const trigger = useReviewPromptUi.getState().pending ?? 'return';
  useReviewPromptUi.getState().hide();
  useReviewStore.getState().markRated(Date.now());
  void requestOsReview(trigger, 'accept');
}

// iOS カードの「あとで」。次は 90 日後以降
export function dismissReviewPrompt(): void {
  const trigger = useReviewPromptUi.getState().pending ?? 'return';
  useReviewPromptUi.getState().hide();
  logEvent('review_prompt', { trigger, action: 'later' });
}
