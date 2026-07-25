import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

interface InfoDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

// 初回起動時の案内ダイアログ(旧awesome_dialog INFO_REVERSED相当)
export function InfoDialog({ visible, title, message, onClose }: InfoDialogProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>OK</Text>
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
  title: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: '#333333',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: '#555555',
    textAlign: 'center',
    marginTop: 12,
  },
  button: {
    marginTop: 20,
    backgroundColor: colors.blueGrey,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 48,
  },
  buttonText: {
    color: colors.textPrimary,
    fontFamily: fontFamily.medium,
    fontSize: 16,
  },
});
