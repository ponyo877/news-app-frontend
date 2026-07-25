import { FlashList } from '@shopify/flash-list';
import { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';

import { useLatestArticles } from '@/api/queries';
import { NewsCard } from '@/components/NewsCard';
import type { ArticleMeta } from '@/stores/articleStatusStore';
import { colors } from '@/theme/colors';

interface LatestListProps {
  onPressMenu: (article: ArticleMeta, favoriteFlg: boolean) => void;
}

// 新着記事の無限スクロール(lastPublishedAtカーソル)。
// 旧版のitemBuilder内getPost(false)呼び出しはonEndReachedに置き換え(多重リクエスト是正)
export function LatestList({ onPressMenu }: LatestListProps) {
  const query = useLatestArticles();
  const articles = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.data),
    [query.data],
  );

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <FlashList
      data={articles}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      renderItem={({ item }) => <NewsCard article={item} onPressMenu={onPressMenu} />}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) {
          void query.fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        query.hasNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator size={32} color={colors.textPrimary} />
          </View>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => void query.refetch()}
          tintColor={colors.textPrimary}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingVertical: 8, alignItems: 'center' },
});
