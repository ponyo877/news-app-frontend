import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

interface NotificationPromptDialogProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

// プッシュ通知のプレ許諾ダイアログ。
// OSのプロンプトは一度拒否されると設定アプリからしか戻せないため、
// 自前の画面で価値を説明してから「受け取る」を押した人にだけOSプロンプトを出す
export function NotificationPromptDialog({
  visible,
  onAccept,
  onDecline,
}: NotificationPromptDialogProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDecline}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.emoji}>🔔</Text>
          <Text style={styles.title}>人気記事をお届けします</Text>
          <Text style={styles.message}>
            いま一番読まれているまとめ記事を、朝と夜の1日2回だけ通知でお知らせします。設定からいつでもオフにできます。
          </Text>
          <Pressable style={styles.acceptButton} onPress={onAccept}>
            <Text style={styles.acceptButtonText}>受け取る</Text>
          </Pressable>
          <Pressable style={styles.declineButton} onPress={onDecline}>
            <Text style={styles.declineButtonText}>あとで</Text>
          </Pressable>
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
    padding: 24,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: '#333333',
    textAlign: 'center',
    marginTop: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: '#555555',
    textAlign: 'center',
    marginTop: 12,
  },
  acceptButton: {
    marginTop: 20,
    backgroundColor: colors.blueGrey,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 48,
  },
  acceptButtonText: {
    color: colors.textPrimary,
    fontFamily: fontFamily.medium,
    fontSize: 16,
  },
  declineButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  declineButtonText: {
    color: '#888888',
    fontFamily: fontFamily.regular,
    fontSize: 14,
  },
});
