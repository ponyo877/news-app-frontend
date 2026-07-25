import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Comment } from '@/api/schemas';
import { commentReportUrl } from '@/lib/reportForms';
import type { RootNavigation } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

// 通報理由(旧版と同一の8項目、先頭はプレースホルダー)
const REPORT_REASONS = [
  '通報理由を選択',
  '性的な内容',
  '出会い目的',
  '荒らし',
  '他アプリへの移動',
  '勧誘・営業',
  '犯罪行為',
  'その他',
] as const;

interface ReportCommentDialogProps {
  articleId: string;
  comment: Comment;
  onClose: () => void;
}

// コメント通報ダイアログ(旧AlertDialog+ReportDropdown相当)
export function ReportCommentDialog({ articleId, comment, onClose }: ReportCommentDialogProps) {
  const navigation = useNavigation<RootNavigation>();
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const submit = () => {
    onClose();
    navigation.navigate('NormalWebView', {
      title: 'コメントの通報',
      url: commentReportUrl({
        articleId,
        commentId: comment.id,
        userName: comment.name,
        message: comment.message,
        reason,
      }),
    });
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>通報理由を入力してください</Text>
          <Text style={styles.detail}>user: {comment.name}</Text>
          <Text style={styles.detail} numberOfLines={3}>
            message: {comment.message}
          </Text>
          <Pressable style={styles.dropdown} onPress={() => setDropdownOpen((open) => !open)}>
            <Text style={styles.dropdownLabel}>{reason}</Text>
            <MaterialIcons
              name={dropdownOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
              size={24}
              color="#333333"
            />
          </Pressable>
          {dropdownOpen && (
            <View style={styles.dropdownList}>
              {REPORT_REASONS.map((item) => (
                <Pressable
                  key={item}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setReason(item);
                    setDropdownOpen(false);
                  }}
                >
                  <Text style={styles.dropdownLabel}>{item}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <Text style={styles.note}>通報内容はアプリ管理者に報告されます</Text>
          <View style={styles.actions}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.actionLabel}>キャンセル</Text>
            </Pressable>
            <Pressable onPress={submit} hitSlop={8} disabled={reason === REPORT_REASONS[0]}>
              <Text
                style={[
                  styles.actionLabel,
                  reason === REPORT_REASONS[0] && styles.actionDisabled,
                ]}
              >
                通報
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  dialog: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
  },
  title: {
    fontSize: 16,
    fontFamily: fontFamily.bold,
    color: '#222222',
    marginBottom: 12,
  },
  detail: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: '#444444',
    marginBottom: 4,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#BBBBBB',
    paddingVertical: 8,
    marginTop: 8,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 4,
    marginTop: 4,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownLabel: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: '#333333',
  },
  note: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: '#666666',
    marginTop: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 24,
    marginTop: 16,
  },
  actionLabel: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.lightBlue,
  },
  actionDisabled: {
    color: '#AAAAAA',
  },
});
