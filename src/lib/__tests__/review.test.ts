import {
  REVIEW_COOLDOWN_DAYS,
  REVIEW_MAX_PER_YEAR,
  REVIEW_MIN_ACTIVE_DAYS,
  REVIEW_MIN_DAYS,
  REVIEW_MIN_READS,
  REVIEW_NEGATIVE_QUIET_DAYS,
  evaluateReviewPrompt,
  localDayKey,
  reviewPromptCopy,
} from '@/lib/review';
import type { ReviewPromptInput } from '@/lib/review';
import { migrateReviewState } from '@/stores/reviewStore';

jest.mock('expo-store-review', () => ({ isAvailableAsync: jest.fn(), requestReview: jest.fn() }));

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

const eligible: ReviewPromptInput = {
  trigger: 'tts_complete',
  readCount: REVIEW_MIN_READS.tts_complete,
  activeDayCount: REVIEW_MIN_ACTIVE_DAYS,
  installAt: NOW - REVIEW_MIN_DAYS * DAY,
  promptedAt: [],
  ratedAt: null,
  lastNegativeAt: null,
  sessionHadError: false,
  now: NOW,
};

describe('evaluateReviewPrompt', () => {
  it('読み上げ完了+既読5本+利用3日+インストール3日+未依頼なら依頼する', () => {
    expect(evaluateReviewPrompt(eligible)).toBe(true);
  });

  it('お気に入り追加も既読5本で依頼する', () => {
    expect(evaluateReviewPrompt({ ...eligible, trigger: 'favorite' })).toBe(true);
  });

  it('一覧に戻っただけのトリガーは既読10本が要る', () => {
    expect(evaluateReviewPrompt({ ...eligible, trigger: 'return', readCount: 9 })).toBe(false);
    expect(evaluateReviewPrompt({ ...eligible, trigger: 'return', readCount: 10 })).toBe(true);
  });

  it('既読が足りなければ依頼しない', () => {
    expect(
      evaluateReviewPrompt({ ...eligible, readCount: REVIEW_MIN_READS.tts_complete - 1 }),
    ).toBe(false);
  });

  it('利用日が3日未満なら依頼しない(初日に使い倒しても聞かない)', () => {
    expect(
      evaluateReviewPrompt({ ...eligible, activeDayCount: REVIEW_MIN_ACTIVE_DAYS - 1 }),
    ).toBe(false);
  });

  it('インストールから3日未満なら依頼しない', () => {
    expect(
      evaluateReviewPrompt({ ...eligible, installAt: NOW - REVIEW_MIN_DAYS * DAY + 1 }),
    ).toBe(false);
  });

  it('installAt未記録なら依頼しない', () => {
    expect(evaluateReviewPrompt({ ...eligible, installAt: null })).toBe(false);
  });

  it('前回依頼から90日未満なら依頼しない、90日経てば再依頼する', () => {
    expect(
      evaluateReviewPrompt({ ...eligible, promptedAt: [NOW - REVIEW_COOLDOWN_DAYS * DAY + 1] }),
    ).toBe(false);
    expect(
      evaluateReviewPrompt({ ...eligible, promptedAt: [NOW - REVIEW_COOLDOWN_DAYS * DAY] }),
    ).toBe(true);
  });

  it('直近1年に3回依頼していたら依頼しない(1年より前の分は数えない)', () => {
    const inYear = [300, 200, 100].map((d) => NOW - d * DAY);
    expect(evaluateReviewPrompt({ ...eligible, promptedAt: inYear })).toBe(false);
    expect(inYear.length).toBe(REVIEW_MAX_PER_YEAR);
    const oneExpired = [400, 200, 100].map((d) => NOW - d * DAY);
    expect(evaluateReviewPrompt({ ...eligible, promptedAt: oneExpired })).toBe(true);
  });

  it('「評価する」を押した人には二度と依頼しない', () => {
    expect(evaluateReviewPrompt({ ...eligible, ratedAt: NOW - 400 * DAY })).toBe(false);
  });

  it('不具合報告から14日以内は依頼しない', () => {
    expect(
      evaluateReviewPrompt({
        ...eligible,
        lastNegativeAt: NOW - REVIEW_NEGATIVE_QUIET_DAYS * DAY + 1,
      }),
    ).toBe(false);
    expect(
      evaluateReviewPrompt({ ...eligible, lastNegativeAt: NOW - REVIEW_NEGATIVE_QUIET_DAYS * DAY }),
    ).toBe(true);
  });

  it('このセッションで記事の取得エラーを見ていたら依頼しない', () => {
    expect(evaluateReviewPrompt({ ...eligible, sessionHadError: true })).toBe(false);
  });
});

describe('reviewPromptCopy', () => {
  it('トリガーごとに事実だけの見出しを返し、星や高評価の要求は書かない', () => {
    for (const trigger of ['tts_complete', 'favorite', 'return'] as const) {
      const { title, message } = reviewPromptCopy(trigger, 12);
      expect(title).toContain('ありがとうございます');
      expect(`${title}${message}`).not.toMatch(/星|高評価|5つ|★/);
    }
    expect(reviewPromptCopy('return', 12).title).toContain('12日');
  });
});

describe('localDayKey', () => {
  it('ローカル日付を YYYY-MM-DD で返す', () => {
    expect(localDayKey(new Date(2026, 7, 9, 23, 59).getTime())).toBe('2026-08-09');
  });
});

describe('migrateReviewState', () => {
  it('v1 の requestedAt は前回依頼時刻として引き継ぐ(90日後に再依頼できる)', () => {
    expect(migrateReviewState({ installAt: 1, requestedAt: 2 }, 1)).toEqual({
      installAt: 1,
      activeDays: [],
      promptedAt: [2],
      ratedAt: null,
      lastNegativeAt: null,
    });
  });

  it('v1 で未依頼なら promptedAt は空', () => {
    expect(migrateReviewState({ installAt: 1, requestedAt: null }, 1).promptedAt).toEqual([]);
  });

  it('v2 以降はそのまま', () => {
    const v2 = { installAt: 1, activeDays: ['2026-08-29'], promptedAt: [], ratedAt: null, lastNegativeAt: null };
    expect(migrateReviewState(v2, 2)).toEqual(v2);
  });
});
