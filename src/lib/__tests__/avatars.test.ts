import { avatarIdFromLegacyPath, freeImageSource } from '@/lib/avatars';

describe('avatarIdFromLegacyPath', () => {
  it('旧版のアイコンパスからIDを抽出できる', () => {
    expect(avatarIdFromLegacyPath('assets/images/icon/myimage_7.png')).toBe(7);
    expect(avatarIdFromLegacyPath('assets/images/icon/myimage_22.png')).toBe(22);
  });

  it('範囲外・不正値はnull', () => {
    expect(avatarIdFromLegacyPath('assets/images/icon/myimage_23.png')).toBeNull();
    expect(avatarIdFromLegacyPath('assets/images/icon/myimage_0.png')).toBeNull();
    expect(avatarIdFromLegacyPath('foo.png')).toBeNull();
    expect(avatarIdFromLegacyPath(null)).toBeNull();
    expect(avatarIdFromLegacyPath('')).toBeNull();
  });
});

describe('freeImageSource', () => {
  it('フリー画像フォールバックURLはドメインを問わずローカル資産にマップする', () => {
    // 死んだ旧ドメイン(本番APIが現在返す値)
    expect(freeImageSource('https://matome-kun.ga/static/myimage_6.png')).not.toBeNull();
    // 現行ドメイン
    expect(freeImageSource('https://matome.folks-chat.com/static/myimage_22.png')).not.toBeNull();
    expect(freeImageSource('http://matome-kun.ga/static/myimage_1.png')).not.toBeNull();
  });

  it('通常の記事画像URLや範囲外はnull(リモート取得にフォールスルー)', () => {
    expect(freeImageSource('https://livedoor.blogimg.jp/nwknews/imgs/4/8/481704c6-s.jpg')).toBeNull();
    expect(freeImageSource('https://matome-kun.ga/static/myimage_23.png')).toBeNull();
    expect(freeImageSource('https://matome-kun.ga/static/myimage_0.png')).toBeNull();
    expect(freeImageSource('https://example.com/myimage_5.png')).toBeNull();
    expect(freeImageSource('')).toBeNull();
  });
});
