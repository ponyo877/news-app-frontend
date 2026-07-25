/* eslint-disable @typescript-eslint/no-unsafe-assignment --
 * Metroのアセットrequire()は型定義上anyを返すため、このファイルのみ許容する */
import type { ImageSourcePropType } from 'react-native';

// アバター22種。Metroのrequireは静的パス必須のため列挙する。
export const avatarSources: Record<number, ImageSourcePropType> = {
  1: require('../../assets/avatars/myimage_1.png'),
  2: require('../../assets/avatars/myimage_2.png'),
  3: require('../../assets/avatars/myimage_3.png'),
  4: require('../../assets/avatars/myimage_4.png'),
  5: require('../../assets/avatars/myimage_5.png'),
  6: require('../../assets/avatars/myimage_6.png'),
  7: require('../../assets/avatars/myimage_7.png'),
  8: require('../../assets/avatars/myimage_8.png'),
  9: require('../../assets/avatars/myimage_9.png'),
  10: require('../../assets/avatars/myimage_10.png'),
  11: require('../../assets/avatars/myimage_11.png'),
  12: require('../../assets/avatars/myimage_12.png'),
  13: require('../../assets/avatars/myimage_13.png'),
  14: require('../../assets/avatars/myimage_14.png'),
  15: require('../../assets/avatars/myimage_15.png'),
  16: require('../../assets/avatars/myimage_16.png'),
  17: require('../../assets/avatars/myimage_17.png'),
  18: require('../../assets/avatars/myimage_18.png'),
  19: require('../../assets/avatars/myimage_19.png'),
  20: require('../../assets/avatars/myimage_20.png'),
  21: require('../../assets/avatars/myimage_21.png'),
  22: require('../../assets/avatars/myimage_22.png'),
};

export const AVATAR_IDS = Object.keys(avatarSources).map(Number);

export function avatarSource(avatarId: number): ImageSourcePropType {
  return avatarSources[avatarId] ?? avatarSources[1]!;
}

// 旧版のアイコン保存値 'assets/images/icon/myimage_N.png' からIDを抽出(レガシー移行用)
export function avatarIdFromLegacyPath(path: string | null | undefined): number | null {
  if (!path) {
    return null;
  }
  const match = /myimage_(\d+)\.png$/.exec(path);
  if (!match?.[1]) {
    return null;
  }
  const id = Number(match[1]);
  return id >= 1 && id <= 22 ? id : null;
}

// サーバーのフリー画像フォールバック(RSSに画像がない記事に付与される
// /static/myimage_N.png)は同一画像をアプリに同梱しているため、ローカル資産で表示する。
// 旧ドメイン(matome-kun.ga)死亡によるリンク切れ対策+通信ゼロ化
const FREE_IMAGE_PATH = /\/static\/myimage_(\d+)\.png$/;

export function freeImageSource(url: string): ImageSourcePropType | null {
  const match = FREE_IMAGE_PATH.exec(url);
  if (!match?.[1]) {
    return null;
  }
  const id = Number(match[1]);
  return id >= 1 && id <= 22 ? avatarSource(id) : null;
}

// コメントのimage_url: フリー画像はローカル資産、httpならリモート画像、
// そうでなければ旧版のアセットパス文字列
export function commentAvatarSource(imageUrl: string): ImageSourcePropType {
  const freeImage = freeImageSource(imageUrl);
  if (freeImage) {
    return freeImage;
  }
  if (imageUrl.startsWith('http')) {
    return { uri: imageUrl };
  }
  const legacyId = avatarIdFromLegacyPath(imageUrl);
  return avatarSource(legacyId ?? 1);
}
