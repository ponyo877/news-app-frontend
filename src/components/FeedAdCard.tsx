import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { adsHidden, bannerAdUnitId } from '@/lib/ads';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

// 一覧に差し込むインフィード広告カード。
//
// AdMobから「ナビゲーションと誤認する配置」の指摘を受けているため、
// 記事カードと見間違えない・誤タップしないことを最優先で作る:
//   - 上下マージンをNewsCard(4)より広い12にして物理的に離す
//   - 上下に区切り線を引き、広告の範囲を明示する
//   - 背景をappBar色にしてNewsCard(surface)と塗り分ける
//   - 「広告」ラベルを常時表示する
//
// 配信が無いあいだ(アカウント停止・在庫切れ・オフライン)は枠ごと畳む。
// BannerAdは未配信のとき何も描画しないため、畳まないと区切り線と
// 「広告」ラベルだけの空枠が記事の間に残る
export function FeedAdCard() {
  // 撮影用ビルド(EXPO_PUBLIC_ADS_ENV=off)では枠ごと出さない。hooks を持つ本体は別関数に分けて条件分岐する
  return adsHidden ? null : <FeedAdBanner />;
}

function FeedAdBanner() {
  const [filled, setFilled] = useState(false);

  return (
    // 高さ0にしてもBannerAdはマウントされたままなので広告リクエストは続く
    <View style={filled ? styles.card : styles.collapsed}>
      {filled && <Text style={styles.label}>広告</Text>}
      <BannerAd
        unitId={bannerAdUnitId}
        size={BannerAdSize.BANNER}
        onAdLoaded={() => setFilled(true)}
        onAdFailedToLoad={() => setFilled(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 12,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.appBar,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.white10,
  },
  collapsed: {
    height: 0,
    overflow: 'hidden',
  },
  label: {
    alignSelf: 'flex-start',
    marginLeft: 12,
    marginBottom: 6,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: fontFamily.regular,
    color: colors.textDisabled,
  },
});
