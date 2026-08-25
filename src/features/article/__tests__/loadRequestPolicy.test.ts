import { decideLoadRequest } from '@/features/article/loadRequestPolicy';
import { SOURCE_LINK_URL } from '@/scraper/serialize';

const ARTICLE_URL = 'https://itainews.com/archives/1.html';

describe('decideLoadRequest', () => {
  it('出典リンクは外部ブラウザへ逃がす', () => {
    expect(decideLoadRequest({ url: SOURCE_LINK_URL, isTopFrame: true }, ARTICLE_URL)).toBe(
      'open-source',
    );
  });

  it('トップフレームは記事URLとabout:blankだけ許可する', () => {
    expect(decideLoadRequest({ url: ARTICLE_URL, isTopFrame: true }, ARTICLE_URL)).toBe('allow');
    expect(decideLoadRequest({ url: 'about:blank', isTopFrame: true }, ARTICLE_URL)).toBe('allow');
    expect(
      decideLoadRequest(
        { url: 'https://www.youtube.com/watch?v=1', isTopFrame: true },
        ARTICLE_URL,
      ),
    ).toBe('deny');
  });

  // iOSはiframe(サブフレーム)の読み込みでもハンドラが呼ばれる。
  // 1.51までYouTube等の埋め込みが真っ白だったのは、ここで記事URL以外を全て遮断していたため
  it('iOSのサブフレームは埋め込みホストだけ許可する', () => {
    expect(
      decideLoadRequest(
        { url: 'https://www.youtube.com/embed/abc', isTopFrame: false },
        ARTICLE_URL,
      ),
    ).toBe('allow');
    expect(
      decideLoadRequest(
        { url: 'https://platform.twitter.com/embed/Tweet.html?id=1', isTopFrame: false },
        ARTICLE_URL,
      ),
    ).toBe('allow');
    expect(
      decideLoadRequest(
        { url: 'https://news4vip.livedoor.biz/nsq.html', isTopFrame: false },
        ARTICLE_URL,
      ),
    ).toBe('deny');
  });

  // AndroidはisTopFrameを付けない(サブフレームでは呼ばれない)ので従来どおりの判定
  it('isTopFrame無し(Android)はトップフレームとして判定する', () => {
    expect(decideLoadRequest({ url: ARTICLE_URL }, ARTICLE_URL)).toBe('allow');
    expect(decideLoadRequest({ url: 'https://www.youtube.com/embed/abc' }, ARTICLE_URL)).toBe(
      'deny',
    );
  });
});
