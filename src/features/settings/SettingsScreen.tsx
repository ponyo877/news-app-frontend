import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Application from 'expo-application';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { isAdsPrivacyOptionsRequired, showAdsPrivacyOptionsForm } from '@/lib/ads';
import { ProfileCard } from '@/features/settings/ProfileCard';
import { MenuItem, buildMenuItems } from '@/features/settings/menuItems';
import { logEvent } from '@/lib/analytics';
import { registerPushToken, requestPermissionAndRegister } from '@/lib/notifications';
import type { RootNavigation } from '@/navigation/types';
import { useNotificationStore } from '@/stores/notificationStore';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

// Settingタブ(旧SettingScreen): プロフィール+メニューリスト
export function SettingsScreen() {
  const navigation = useNavigation<RootNavigation>();
  const [showAdsPrivacy, setShowAdsPrivacy] = useState(false);
  const digestEnabled = useNotificationStore((s) => s.digestEnabled);
  const matsuriEnabled = useNotificationStore((s) => s.matsuriEnabled);

  useEffect(() => {
    void isAdsPrivacyOptionsRequired().then(setShowAdsPrivacy);
  }, []);

  const menuItems = buildMenuItems(Application.nativeApplicationVersion ?? '-', showAdsPrivacy);

  // 設定画面からの明示操作なので、未許諾端末ではここでOSプロンプトを出してよい。
  // OFFはサーバ側の配信対象からも外す(digest=falseで上書き登録)
  const onToggleDigest = (value: boolean) => {
    const store = useNotificationStore.getState();
    store.setDigestEnabled(value);
    store.setPromptDone();
    logEvent('digest_toggle', { enabled: String(value) });
    if (value) {
      void requestPermissionAndRegister(true, store.matsuriEnabled);
    } else {
      void registerPushToken(false, store.matsuriEnabled);
    }
  };

  const onToggleMatsuri = (value: boolean) => {
    const store = useNotificationStore.getState();
    store.setMatsuriEnabled(value);
    store.setPromptDone();
    logEvent('matsuri_toggle', { enabled: String(value) });
    if (value) {
      void requestPermissionAndRegister(store.digestEnabled, true);
    } else {
      void registerPushToken(store.digestEnabled, false);
    }
  };

  const onPressItem = (item: MenuItem) => {
    switch (item.action.type) {
      case 'selectSites':
        navigation.navigate('SelectSites');
        break;
      case 'ngWords':
        navigation.navigate('NgWords');
        break;
      case 'webview':
        navigation.navigate('NormalWebView', {
          title: item.action.title,
          url: item.action.url,
        });
        break;
      case 'adsPrivacy':
        void showAdsPrivacyOptionsForm();
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
              disabled={
                item.action.type === 'none' ||
                item.action.type === 'digestToggle' ||
                item.action.type === 'matsuriToggle'
              }
            >
              <MaterialIcons name={item.icon} size={24} color={colors.textPrimary} />
              <Text style={styles.title}>{item.title}</Text>
              {item.action.type === 'digestToggle' ? (
                <Switch
                  value={digestEnabled}
                  onValueChange={onToggleDigest}
                  trackColor={{ true: colors.blueGrey }}
                />
              ) : item.action.type === 'matsuriToggle' ? (
                <Switch
                  value={matsuriEnabled}
                  onValueChange={onToggleMatsuri}
                  trackColor={{ true: colors.blueGrey }}
                />
              ) : (
                item.action.type !== 'none' && (
                  <MaterialIcons
                    name="keyboard-arrow-right"
                    size={24}
                    color={colors.textSecondary}
                  />
                )
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
