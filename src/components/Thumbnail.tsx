import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { freeImageSource } from '@/lib/avatars';
import { colors } from '@/theme/colors';
import { radius, sizes } from '@/theme/typography';

// 記事サムネイル60x60角丸10。
// サーバーのフリー画像フォールバックは同梱アセットで表示(リンク切れ対策)。
// それ以外のロード失敗は旧版と同じerrorアイコン表示
export function Thumbnail({ uri }: { uri: string }) {
  const [failed, setFailed] = useState(false);
  const localSource = uri ? freeImageSource(uri) : null;

  if (localSource) {
    return <Image source={localSource} style={styles.image} contentFit="cover" />;
  }
  if (!uri || failed) {
    return (
      <View style={styles.fallback}>
        <MaterialIcons name="error" size={24} color={colors.textPrimary} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={styles.image}
      contentFit="cover"
      transition={100}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: sizes.thumbnail,
    height: sizes.thumbnail,
    borderRadius: radius.thumbnail,
  },
  fallback: {
    width: sizes.thumbnail,
    height: sizes.thumbnail,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
