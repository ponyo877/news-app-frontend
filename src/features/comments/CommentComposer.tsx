import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { PostCommentErrorKind, usePostComment } from '@/api/queries';
import { colors } from '@/theme/colors';
import { fontFamily, sizes } from '@/theme/typography';

interface CommentComposerProps {
  articleId: string;
  onError: (message: string) => void;
}

const POST_ERROR_MESSAGES: Record<PostCommentErrorKind, string> = {
  network: '通信に失敗しました\n電波の良い場所で再度お試しください',
  server: 'サーバーが混み合っています\n時間をおいて再度お試しください',
  rejected: 'コメントを投稿できませんでした\n内容をご確認ください',
};

// コメント入力欄(旧buildChatComposer): 高さ60白背景、丸角入力+送信ボタン、50文字制限
export function CommentComposer({ articleId, onError }: CommentComposerProps) {
  const [text, setText] = useState('');
  const postComment = usePostComment(articleId);

  const send = () => {
    const message = text.trim();
    if (message === '' || postComment.isPending) {
      return;
    }
    postComment.mutate(message, {
      onSuccess: () => setText(''),
      // 以前は全エラーを「不適切な表現」と表示していたが、backendにNGワード検査は
      // 存在せず、実際はネットワーク/サーバ障害が大半だった(誤爆の解消)
      onError: (error) =>
        onError(
          POST_ERROR_MESSAGES[error.message as PostCommentErrorKind] ??
            POST_ERROR_MESSAGES.rejected,
        ),
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={50}
          placeholder="コメントを書く ✍"
          placeholderTextColor="#9E9E9E"
        />
      </View>
      <Pressable style={styles.sendButton} onPress={send}>
        <MaterialIcons name="send" size={20} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: sizes.composerHeight,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrap: {
    flex: 1,
    minHeight: sizes.composerInputHeight,
    maxHeight: sizes.composerInputHeight,
    backgroundColor: colors.grey200,
    borderRadius: 15,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  input: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: '#000000',
    paddingVertical: 0,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.comment.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
});
