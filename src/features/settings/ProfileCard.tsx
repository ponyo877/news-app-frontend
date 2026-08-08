import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { postUser } from '@/api/endpoints';
import { avatarSource } from '@/lib/avatars';
import type { RootNavigation } from '@/navigation/types';
import { useUserStore } from '@/stores/userStore';
import { colors } from '@/theme/colors';
import { fontFamily, radius, sizes } from '@/theme/typography';

// プロフィール表示/編集(旧UserConfScreen)。高さ210・white10・角丸16。
// アバタータップで画像選択へ、Edit Name⇔Update Nameトグルで名前編集
export function ProfileCard() {
  const navigation = useNavigation<RootNavigation>();
  const { name, avatarId, devicehash, setName } = useUserStore();
  const [isEdit, setIsEdit] = useState(false);
  const [draft, setDraft] = useState(name);

  const toggleEdit = () => {
    if (isEdit) {
      const newName = draft.trim() === '' ? name : draft.trim();
      setName(newName);
      // 旧版と同じくサーバーへも反映(失敗してもローカルは更新済み)
      if (devicehash) {
        void postUser({ devicehash, name: newName });
      }
    } else {
      setDraft(name);
    }
    setIsEdit((edit) => !edit);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>プロフィール</Text>
      <View style={styles.row}>
        <Pressable style={styles.avatarOuter} onPress={() => navigation.navigate('SelectAvatar')}>
          <Image source={avatarSource(avatarId)} style={styles.avatar} />
          <View style={styles.cameraBadge}>
            <MaterialIcons name="photo-camera" size={28} color="#404040" />
          </View>
        </Pressable>
        <View style={styles.nameArea}>
          {isEdit ? (
            <TextInput
              style={styles.nameInput}
              value={draft}
              onChangeText={setDraft}
              maxLength={10}
              autoFocus
              textAlign="center"
            />
          ) : (
            <Text style={styles.name}>{name}</Text>
          )}
          <Pressable style={styles.editButton} onPress={toggleEdit}>
            <Text style={styles.editLabel}>{isEdit ? '名前を保存' : '名前を変更'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: sizes.profileCardHeight,
    backgroundColor: colors.white10,
    borderRadius: 16,
    alignItems: 'center',
  },
  heading: {
    marginTop: 10,
    fontSize: 20,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingLeft: 20,
    marginTop: 8,
  },
  avatarOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameArea: {
    flex: 1,
    alignItems: 'center',
  },
  name: {
    fontSize: 20,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    paddingTop: 16,
  },
  nameInput: {
    fontSize: 20,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary,
    minWidth: 140,
    paddingTop: 16,
    paddingBottom: 4,
  },
  editButton: {
    marginTop: 14,
    backgroundColor: colors.profileAccent,
    borderRadius: radius.profileButton,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editLabel: {
    fontSize: 20,
    fontFamily: fontFamily.medium,
    color: '#FFFFFF',
  },
});
