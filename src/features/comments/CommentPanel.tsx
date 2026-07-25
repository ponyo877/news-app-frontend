import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useComments } from '@/api/queries';
import type { Comment } from '@/api/schemas';
import { CommentBubble } from '@/features/comments/CommentBubble';
import { CommentComposer } from '@/features/comments/CommentComposer';
import { ReportCommentDialog } from '@/features/comments/ReportCommentDialog';
import { useUserStore } from '@/stores/userStore';
import { colors } from '@/theme/colors';
import { fontFamily, radius } from '@/theme/typography';

// コメント欄(旧CommentScreen+Conversation)。白背景・上部角丸30。
// 記事画面下半分に埋め込まれる
export function CommentPanel({ articleId }: { articleId: string }) {
  const devicehash = useUserStore((s) => s.devicehash);
  const commentsQuery = useComments(articleId);
  const [reportTarget, setReportTarget] = useState<Comment | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (toast === null) {
      return;
    }
    const timer = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <View style={styles.panel}>
      <Pressable style={styles.listArea} onPress={() => Keyboard.dismiss()}>
        <CommentList
          comments={commentsQuery.data}
          isLoading={commentsQuery.isLoading}
          devicehash={devicehash ?? ''}
          onPressReport={setReportTarget}
        />
      </Pressable>
      <CommentComposer articleId={articleId} onError={setToast} />
      {toast !== null && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
      {reportTarget && (
        <ReportCommentDialog
          articleId={articleId}
          comment={reportTarget}
          onClose={() => setReportTarget(null)}
        />
      )}
    </View>
  );
}

interface CommentListProps {
  comments: Comment[] | undefined;
  isLoading: boolean;
  devicehash: string;
  onPressReport: (comment: Comment) => void;
}

function CommentList({ comments, isLoading, devicehash, onPressReport }: CommentListProps) {
  if (isLoading || comments === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blueGrey} />
      </View>
    );
  }
  if (comments.length === 0) {
    return <Text style={styles.empty}>コメントはありません</Text>;
  }
  return (
    <FlatList
      data={comments}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <CommentBubble
          comment={item}
          isMe={item.device_hash === devicehash}
          onPressReport={onPressReport}
        />
      )}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
    />
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
  listArea: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    marginTop: 10,
    textAlign: 'center',
    color: '#000000',
    fontFamily: fontFamily.regular,
    fontSize: 14,
  },
  toast: {
    position: 'absolute',
    bottom: 70,
    left: 20,
    right: 20,
    backgroundColor: '#323232',
    borderRadius: 4,
    padding: 12,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: fontFamily.regular,
  },
});
