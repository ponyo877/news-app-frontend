import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Comment } from '@/api/schemas';
import { commentAvatarSource } from '@/lib/avatars';
import { formatDateTime } from '@/lib/format';
import { colors } from '@/theme/colors';
import { fontFamily, fontSize } from '@/theme/typography';

interface CommentBubbleProps {
  comment: Comment;
  isMe: boolean;
  onPressReport: (comment: Comment) => void;
}

// チャットバブル1件。自分=右寄せ#FCAAAB / 他人=左寄せgrey200、角丸は左右非対称
export function CommentBubble({ comment, isMe, onPressReport }: CommentBubbleProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.row, isMe ? styles.rowMe : styles.rowOther]}>
        {!isMe && (
          <View style={styles.avatarWrap}>
            <Image source={commentAvatarSource(comment.image_url)} style={styles.avatar} />
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {!isMe && (
            <View style={styles.header}>
              <Text style={styles.name}>{comment.name}</Text>
              <Text style={styles.hash}>{comment.device_hash.slice(0, 6)}</Text>
            </View>
          )}
          <Text style={[styles.message, isMe ? styles.messageMe : styles.messageOther]}>
            {comment.message}
          </Text>
        </View>
      </View>
      <View style={[styles.timeRow, isMe ? styles.rowMe : styles.rowOther]}>
        {!isMe && <View style={styles.timeIndent} />}
        <Text style={styles.time}>{formatDateTime(comment.created_at)}</Text>
        {!isMe && (
          <Pressable hitSlop={8} onPress={() => onPressReport(comment)}>
            <MaterialIcons name="announcement" size={20} color={colors.comment.meta} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  rowMe: {
    justifyContent: 'flex-end',
  },
  rowOther: {
    justifyContent: 'flex-start',
  },
  avatarWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    overflow: 'hidden',
  },
  avatar: {
    width: 30,
    height: 30,
  },
  bubble: {
    padding: 10,
    maxWidth: '75%',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  bubbleMe: {
    backgroundColor: colors.comment.accent,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 0,
  },
  bubbleOther: {
    backgroundColor: colors.grey200,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 15,
  },
  header: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 2,
  },
  name: {
    fontSize: fontSize.commentHeader,
    fontFamily: fontFamily.bold,
    letterSpacing: 1.5,
    color: colors.lightBlue,
  },
  hash: {
    fontSize: fontSize.commentHeader,
    fontFamily: fontFamily.bold,
    letterSpacing: 1.5,
    color: '#BDBDBD',
  },
  message: {
    fontSize: fontSize.commentBody,
    fontFamily: fontFamily.bold,
    letterSpacing: 1.5,
  },
  messageMe: {
    color: '#FFFFFF',
  },
  messageOther: {
    color: '#424242',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 5,
  },
  timeIndent: {
    width: 40,
  },
  time: {
    fontSize: fontSize.commentTime,
    fontFamily: fontFamily.bold,
    color: colors.comment.meta,
    letterSpacing: 1,
  },
});
