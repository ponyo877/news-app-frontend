import { articleLandingUrl } from '@/lib/share';

describe('articleLandingUrl', () => {
  it('共有着地ページのURLを組み立てる', () => {
    expect(articleLandingUrl('4f70cea4-52bc-44d0-8ec9-eec41b526594')).toBe(
      'https://matome.folks-chat.com/a/4f70cea4-52bc-44d0-8ec9-eec41b526594',
    );
  });
});
