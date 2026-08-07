import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { fontFamily, fontSize, radius } from '@/theme/typography';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

// 通信エラー等の状態表示。従来はエラー時に「無言の空リスト」が出て
// 壊れたアプリに見えていたため、必ず理由と再試行手段を提示する
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
      {onRetry && (
        <Pressable
          style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="再読み込み"
        >
          <Text style={styles.retryLabel}>再読み込み</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 20,
  },
  text: {
    color: colors.textSecondary,
    fontSize: fontSize.cardTitle,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    lineHeight: 24,
  },
  retry: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: radius.profileButton,
    backgroundColor: colors.blueGrey,
  },
  retryPressed: {
    opacity: 0.7,
  },
  retryLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.cardTitle,
    fontFamily: fontFamily.medium,
  },
});
