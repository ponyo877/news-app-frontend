import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TtsStatus } from '@/features/article/useTtsPlayer';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

interface TtsPlayerBarProps {
  status: TtsStatus;
  segmentIndex: number;
  total: number;
  rate: number;
  onToggle: () => void;
  onCycleRate: () => void;
  onClose: () => void;
}

// 読み上げのミニプレイヤー。ヘッダー直下から降りるバー
// (AdMob制約: 記事画面下部にタップ要素を置けないため上に置く)
export function TtsPlayerBar({
  status,
  segmentIndex,
  total,
  rate,
  onToggle,
  onCycleRate,
  onClose,
}: TtsPlayerBarProps) {
  const playing = status === 'playing';
  return (
    <View style={styles.bar}>
      <Pressable
        hitSlop={8}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={playing ? '読み上げを一時停止' : '読み上げを再生'}
      >
        <MaterialIcons
          name={playing ? 'pause-circle-filled' : 'play-circle-filled'}
          size={34}
          color={colors.amber}
        />
      </Pressable>
      <Text style={styles.progress}>
        {status === 'done' ? '読み上げ完了' : `${Math.min(segmentIndex + 1, total)} / ${total}`}
      </Text>
      <Pressable
        style={styles.rateButton}
        hitSlop={8}
        onPress={onCycleRate}
        accessibilityRole="button"
        accessibilityLabel="読み上げ速度を変更"
      >
        <Text style={styles.rateText}>{rate}x</Text>
      </Pressable>
      <Pressable hitSlop={8} onPress={onClose} accessibilityRole="button" accessibilityLabel="読み上げを閉じる">
        <MaterialIcons name="close" size={24} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.appBar,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.white10,
  },
  progress: {
    flex: 1,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
    fontSize: 13,
  },
  rateButton: {
    backgroundColor: colors.white10,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rateText: {
    color: colors.textPrimary,
    fontFamily: fontFamily.medium,
    fontSize: 13,
  },
});
