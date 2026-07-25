import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { fontFamily, fontSize } from '@/theme/typography';

// 「閲覧履歴はありません」等の空状態表示
export function EmptyMessage({ message }: { message: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.textPrimary,
    fontSize: fontSize.sectionLabel,
    fontFamily: fontFamily.regular,
  },
});
