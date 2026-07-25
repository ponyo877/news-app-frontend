import { avatarIdFromLegacyPath } from '@/lib/avatars';

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
