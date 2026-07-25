import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Switch, Text, View } from 'react-native';

import { useSites } from '@/api/queries';
import { useSiteFilterStore } from '@/stores/siteFilterStore';
import { colors } from '@/theme/colors';
import { fontFamily, sizes } from '@/theme/typography';

// 表示サイトの選択(旧SelectSites): Switch+サイトアイコン。
// ブロック状態はストアに即時保存され、画面を離れる時に新着を再取得(旧WillPopScope相当)
export function SelectSitesScreen() {
  const sitesQuery = useSites();
  const { blockedSiteIds, toggleSite } = useSiteFilterStore();
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

  return (
    <FlatList
      style={styles.list}
      data={sitesQuery.data}
      keyExtractor={(site) => site.id}
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
