import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Application from 'expo-application';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProfileCard } from '@/features/settings/ProfileCard';
import { MenuItem, buildMenuItems } from '@/features/settings/menuItems';
import type { RootNavigation } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

// Settingタブ(旧SettingScreen): プロフィール+メニューリスト
export function SettingsScreen() {
  const navigation = useNavigation<RootNavigation>();
  const menuItems = buildMenuItems(Application.nativeApplicationVersion ?? '-');

  const onPressItem = (item: MenuItem) => {
    switch (item.action.type) {
      case 'selectSites':
        navigation.navigate('SelectSites');
        break;
      case 'webview':
        navigation.navigate('NormalWebView', {
          title: item.action.title,
          url: item.action.url,
        });
        break;
      case 'none':
        break;
    }
  };

  return (
    <View style={styles.container}>
      <ProfileCard />
      <View style={styles.menuWrap}>
        <FlatList
          data={menuItems}
          keyExtractor={(item) => item.title}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => onPressItem(item)}
              disabled={item.action.type === 'none'}
            >
              <MaterialIcons name={item.icon} size={24} color={colors.textPrimary} />
              <Text style={styles.title}>{item.title}</Text>
              {item.action.type !== 'none' && (
                <MaterialIcons
                  name="keyboard-arrow-right"
                  size={24}
                  color={colors.textSecondary}
                />
              )}
            </Pressable>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 8,
  },
  menuWrap: {
    flex: 1,
    marginTop: 30,
    backgroundColor: colors.white10,
    borderRadius: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 16,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.textDisabled,
    marginHorizontal: 8,
  },
});
