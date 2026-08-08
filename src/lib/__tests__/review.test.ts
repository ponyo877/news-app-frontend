import { REVIEW_MIN_DAYS, REVIEW_READ_COUNT, shouldRequestReview } from '@/lib/review';

jest.mock('expo-store-review', () => ({ isAvailableAsync: jest.fn(), requestReview: jest.fn() }));

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

const eligible = {
  readCount: REVIEW_READ_COUNT,
  installAt: NOW - REVIEW_MIN_DAYS * DAY,
  requestedAt: null,
  now: NOW,
};

describe('shouldRequestReview', () => {
  it('既読10本+3日経過+未依頼なら依頼する', () => {
    expect(shouldRequestReview(eligible)).toBe(true);
  });

  it('既読が9本なら依頼しない', () => {
    expect(shouldRequestReview({ ...eligible, readCount: REVIEW_READ_COUNT - 1 })).toBe(false);
  });

  it('インストールから3日未満なら依頼しない', () => {
    expect(
      shouldRequestReview({ ...eligible, installAt: NOW - REVIEW_MIN_DAYS * DAY + 1 }),
    ).toBe(false);
  });

  it('依頼済みなら二度と依頼しない', () => {
    expect(shouldRequestReview({ ...eligible, requestedAt: NOW - DAY })).toBe(false);
  });

  it('installAt未記録なら依頼しない', () => {
    expect(shouldRequestReview({ ...eligible, installAt: null })).toBe(false);
  });
});
