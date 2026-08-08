import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSites } from '@/api/queries';
import { logEvent } from '@/lib/analytics';
import { isActiveSite } from '@/lib/sites';
import type { RootNavigation } from '@/navigation/types';
import { useSiteFilterStore } from '@/stores/siteFilterStore';
import { useUserStore } from '@/stores/userStore';
import { colors } from '@/theme/colors';
import { fontFamily, radius } from '@/theme/typography';

// 初回起動オンボーディング(1画面だけ・GROWTH-PLAN §4-5)。
// よく見るサイトを選ばせ、for You の初期シグナル(preferredSiteIds)にする。
// 未選択サイトの自動ブロックはしない(攻撃的すぎるため)。
// スキップ可能で、最初の記事到達を遅らせないことを最優先にする
export function OnboardingScreen() {
  const navigation = useNavigation<RootNavigation>();
  const insets = useSafeAreaInsets();
  const sitesQuery = useSites();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // マウント時に1回だけ確定(レンダー純度の維持)
  const [mountedAt] = useState(() => Date.now());
  const setPreferredSiteIds = useSiteFilterStore((s) => s.setPreferredSiteIds);
  const setOnboardingDone = useUserStore((s) => s.setOnboardingDone);

  // クロール停止サイト(サイト側休止)は見せない
  const sites = (sitesQuery.data ?? []).filter((site) => isActiveSite(site, mountedAt));

  const toggle = (siteId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(siteId)) {
        next.delete(siteId);
      } else {
        next.add(siteId);
      }
      return next;
    });
  };

  const finish = (skipped: boolean) => {
    if (!skipped && selected.size > 0) {
      setPreferredSiteIds([...selected]);
    }
    setOnboardingDone(true);
    logEvent('onboarding_done', { selected_count: skipped ? 0 : selected.size, skipped });
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>よく見るサイトを選ぶ</Text>
        <Pressable hitSlop={8} onPress={() => finish(true)} accessibilityRole="button">
          <Text style={styles.skip}>スキップ</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        選んだサイトの記事が「for You」に出やすくなります(あとから変わっていきます)
      </Text>
      <FlatList
        data={sites}
        numColumns={3}
        keyExtractor={(site) => site.id}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          return (
            <Pressable
              style={[styles.cell, isSelected && styles.cellSelected]}
              onPress={() => toggle(item.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            >
              <Image source={{ uri: item.image }} style={styles.icon} />
              <Text style={styles.siteName} numberOfLines={2}>
                {item.titles}
              </Text>
            </Pressable>
          );
        }}
      />
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.footnote}>ユーザ名とアイコンは設定から変更できます</Text>
        <Pressable
          style={styles.startButton}
          onPress={() => finish(false)}
          accessibilityRole="button"
        >
          <Text style={styles.startButtonText}>
            {selected.size > 0 ? `${selected.size}サイトではじめる` : 'はじめる'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fontFamily.bold,
    fontSize: 22,
  },
  skip: {
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
    fontSize: 14,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    marginTop: 8,
    marginBottom: 12,
  },
  grid: {
    paddingBottom: 16,
  },
  cell: {
    flex: 1,
    margin: 4,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: colors.white10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cellSelected: {
    borderColor: colors.amber,
    backgroundColor: colors.surface,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  siteName: {
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
  footer: {
    paddingTop: 8,
  },
  footnote: {
    color: colors.textDisabled,
    fontFamily: fontFamily.regular,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
  },
  startButton: {
    backgroundColor: colors.blueGrey,
    borderRadius: radius.actionSheet,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startButtonText: {
    color: colors.textPrimary,
    fontFamily: fontFamily.medium,
    fontSize: 16,
  },
});
