import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { postUser } from '@/api/endpoints';
import { AVATAR_IDS, avatarSource, avatarSources } from '@/lib/avatars';
import type { RootStackParamList } from '@/navigation/types';
import { useUserStore } from '@/stores/userStore';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'SelectAvatar'>;

// アバター選択(旧SelectMyimageScreen): 22枚3列グリッド+下部キャンセル/選択バー。
// 旧版のバグ(選択がローカル保存されず再起動で消える)はuserStoreへの保存で修正
export function SelectAvatarScreen({ navigation }: Props) {
  const { avatarId, devicehash, setAvatarId } = useUserStore();
  const [selectedId, setSelectedId] = useState(avatarId);

  const confirm = async () => {
    setAvatarId(selectedId);
    navigation.goBack();
    // 旧版と同じくサーバーへもアップロード(失敗してもローカルは反映済み)
    if (devicehash) {
      try {
        const asset = Asset.fromModule(avatarSources[selectedId] as number);
        await asset.downloadAsync();
        await postUser({
          devicehash,
          avatar: {
            uri: asset.localUri ?? asset.uri,
            fileName: `myimage_${selectedId}.png`,
            mimeType: 'image/png',
          },
        });
      } catch {
        // アップロード失敗は無視(次回変更時に再送される)
      }
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={AVATAR_IDS}
        numColumns={3}
        keyExtractor={(id) => String(id)}
        renderItem={({ item: id }) => (
          <Pressable style={styles.cell} onPress={() => setSelectedId(id)}>
            <Image source={avatarSource(id)} style={styles.avatar} />
            {selectedId === id && (
              <View style={styles.checkOverlay}>
                <MaterialIcons name="check-box" size={28} color={colors.lightBlue} />
              </View>
            )}
          </Pressable>
        )}
      />
      <View style={styles.bottomBar}>
        <Pressable style={styles.bottomButton} onPress={() => navigation.goBack()}>
          <Text style={styles.bottomLabel}>キャンセル</Text>
        </Pressable>
        <View style={styles.bottomDivider} />
        <Pressable style={styles.bottomButton} onPress={confirm}>
          <Text style={styles.bottomLabel}>選択</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  cell: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 6,
  },
  avatar: {
    flex: 1,
    borderRadius: 8,
  },
  checkOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: colors.appBar,
  },
  bottomButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bottomDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.textDisabled,
  },
  bottomLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: fontFamily.medium,
  },
});
