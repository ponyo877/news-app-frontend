import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { logError } from '@/lib/analytics';
import { colors } from '@/theme/colors';
import { fontFamily, fontSize, radius } from '@/theme/typography';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// レンダー中の例外で「白画面のまま固まる」のを防ぐ最後の砦。
// 発生はCrashlyticsに記録する(これが無いと開発者は永久に気付けない)
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    logError(error, 'ErrorBoundary');
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>問題が発生しました</Text>
          <Text style={styles.message}>
            表示中に予期しないエラーが発生しました。{'\n'}
            改善しない場合はアプリを再起動してください。
          </Text>
          <Pressable
            style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
            onPress={() => this.setState({ hasError: false })}
            accessibilityRole="button"
            accessibilityLabel="再表示"
          >
            <Text style={styles.retryLabel}>再表示</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.sectionLabel,
    fontFamily: fontFamily.bold,
  },
  message: {
    color: colors.textSecondary,
    fontSize: fontSize.cardTitle,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    lineHeight: 24,
  },
  retry: {
    marginTop: 8,
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
