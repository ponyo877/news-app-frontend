import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

interface ReviewPromptDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onAccept: () => void;
  onLater: () => void;
}

// ストア評価の前置きカード(iOS のみ。文言は src/lib/review.ts の reviewPromptCopy)。
// 「評価する」を押した人にだけ OS のレビューダイアログを要求する。
// Android では出さない(Play In-App Review は事前の質問文・誘導文を禁じている)
export function ReviewPromptDialog({
  visible,
  title,
  message,
  onAccept,
  onLater,
}: ReviewPromptDialogProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onLater}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.emoji}>😁</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Pressable style={styles.acceptButton} onPress={onAccept} accessibilityRole="button">
            <Text style={styles.acceptButtonText}>評価する</Text>
          </Pressable>
          <Pressable style={styles.laterButton} onPress={onLater} accessibilityRole="button">
            <Text style={styles.laterButtonText}>あとで</Text>
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
  laterButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  laterButtonText: {
    color: '#888888',
    fontFamily: fontFamily.regular,
    fontSize: 14,
  },
});
