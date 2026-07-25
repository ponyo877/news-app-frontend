import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius } from '@/theme/typography';

// コメント欄(Phase 4で実装)。白背景・上部角丸30のコンテナ
export function CommentPanel({ articleId }: { articleId: string }) {
  return (
    <View style={styles.panel}>
      <Text>コメント欄(Phase 4で実装): {articleId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: colors.comment.background,
    borderTopLeftRadius: radius.commentSheet,
    borderTopRightRadius: radius.commentSheet,
    overflow: 'hidden',
  },
});
