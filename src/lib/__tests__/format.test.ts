import { formatDateTime } from '@/lib/format';

describe('formatDateTime', () => {
  it('空文字は空文字のまま(旧版のSpacer相当)', () => {
    expect(formatDateTime('')).toBe('');
  });

  it('ISO8601をローカル時刻 YYYY-MM-DD HH:mm:ss で表示する', () => {
    expect(formatDateTime('2023-09-09T12:34:56Z')).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('不正な文字列は空文字にする', () => {
    expect(formatDateTime('not-a-date')).toBe('');
  });
});
