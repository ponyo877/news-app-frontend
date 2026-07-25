import { parseSkipIdsCsv } from '@/migration/legacySkipIds';

describe('parseSkipIdsCsv', () => {
  it('カンマ区切りをパースする', () => {
    expect(parseSkipIdsCsv('site1,site2,site3')).toEqual(['site1', 'site2', 'site3']);
  });

  it('空文字・末尾カンマ・空白を許容する', () => {
    expect(parseSkipIdsCsv('')).toEqual([]);
    expect(parseSkipIdsCsv('site1,')).toEqual(['site1']);
    expect(parseSkipIdsCsv(' site1 , site2 ')).toEqual(['site1', 'site2']);
    expect(parseSkipIdsCsv(',,')).toEqual([]);
  });
});
