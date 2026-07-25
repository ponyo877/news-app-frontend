import { FlashList } from '@shopify/flash-list';
import type { ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';

import { RankingPeriod } from '@/api/endpoints';
import { usePopularArticles } from '@/api/queries';
import { NewsCard } from '@/components/NewsCard';
import type { ArticleMeta } from '@/stores/articleStatusStore';
import { colors } from '@/theme/colors';

interface PopularListProps {
  period: RankingPeriod;
  // ランキング表示では順位数字をleadingに渡す
  renderLeading?: (index: number) => ReactNode;
  onPressMenu: (article: ArticleMeta, favoriteFlg: boolean) => void;
}

// 人気記事リスト。「for You」タブ(旧版はdaily人気の流用)とRankingタブで共用
export function PopularList({ period, renderLeading, onPressMenu }: PopularListProps) {
  const query = usePopularArticles(period);

  if (query.isLoading || !query.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <FlashList
      data={query.data}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      renderItem={({ item, index }) => (
        <NewsCard article={item} leading={renderLeading?.(index)} onPressMenu={onPressMenu} />
      )}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          tintColor={colors.textPrimary}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
