import { fontScaleScript } from '@/features/article/fontScale';
import { FONT_SCALES, percentOf, useFontSizeStore } from '@/stores/fontSizeStore';

describe('fontSizeStore', () => {
  it('デフォルトは標準(M=100%)', () => {
    expect(useFontSizeStore.getState().scale).toBe('M');
    expect(percentOf('M')).toBe(100);
  });

  it('4段階の対応表', () => {
    expect(FONT_SCALES.map((s) => [s.key, s.percent])).toEqual([
      ['S', 87],
      ['M', 100],
      ['L', 115],
      ['XL', 130],
    ]);
  });
});

describe('fontScaleScript', () => {
  it('zoom倍率が埋め込まれ、末尾がtrue;(RN WebViewの作法)', () => {
    const script = fontScaleScript(115);
    expect(script).toContain("zoom='1.15'");
    expect(script.endsWith('true;')).toBe(true);
  });
});
