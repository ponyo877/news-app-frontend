import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { useSites } from '@/api/queries';
import { isActiveSite } from '@/lib/sites';
import { useSiteFilterStore } from '@/stores/siteFilterStore';
import { colors } from '@/theme/colors';
import { fontFamily, sizes } from '@/theme/typography';

// 表示サイトの選択(旧SelectSites): Switch+サイトアイコン。
// ブロック状態はストアに即時保存され、画面を離れる時に新着を再取得(旧WillPopScope相当)。
// サイト数増(8→約70)に伴い、表示中件数と一括切り替えをヘッダーに置く
export function SelectSitesScreen() {
  const sitesQuery = useSites();
  // マウント時に1回だけ確定(レンダー純度の維持)
  const [mountedAt] = useState(() => Date.now());
  const { blockedSiteIds, toggleSite, setBlockedSiteIds } = useSiteFilterStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    return () => {
      void queryClient.invalidateQueries({ queryKey: ['articles', 'latest'] });
    };
  }, [queryClient]);

  if (sitesQuery.isLoading || !sitesQuery.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  // クロール停止サイト(サイト側休止・30日以上更新なし)は選択肢から外す
  const sites = sitesQuery.data.filter((site) => isActiveSite(site, mountedAt));
  const visibleCount = sites.filter((site) => !blockedSiteIds.includes(site.id)).length;

  return (
    <FlatList
      style={styles.list}
      data={sites}
      keyExtractor={(site) => site.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.count}>
            {sites.length}サイト中{visibleCount}件を表示
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setBlockedSiteIds([])}
            hitSlop={8}
          >
            <Text style={styles.bulkAction}>すべて表示</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setBlockedSiteIds(sites.map((site) => site.id))}
            hitSlop={8}
          >
            <Text style={styles.bulkAction}>すべて非表示</Text>
          </Pressable>
        </View>
      }
      renderItem={({ item: site }) => (
        <View style={styles.row}>
          <Image source={{ uri: site.image }} style={styles.icon} />
          <Text style={styles.title} numberOfLines={1}>
            {site.titles}
          </Text>
          <Switch
            value={!blockedSiteIds.includes(site.id)}
            onValueChange={() => toggleSite(site.id)}
            trackColor={{ true: colors.blueGrey }}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  count: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fontFamily.regular,
  },
  bulkAction: {
    color: colors.blueGrey,
    fontSize: 13,
    fontFamily: fontFamily.bold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 16,
  },
  icon: {
    width: sizes.siteIcon,
    height: sizes.siteIcon,
    borderRadius: 8,
  },
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fontFamily.regular,
  },
});
