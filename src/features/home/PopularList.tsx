import { FlashList } from '@shopify/flash-list';
import type { ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';

import { RankingPeriod } from '@/api/endpoints';
import { usePopularArticles } from '@/api/queries';
import { EmptyMessage } from '@/components/EmptyMessage';
import { ErrorState } from '@/components/ErrorState';
import { NewsCard } from '@/components/NewsCard';
import { useVisibleArticles } from '@/lib/useVisibleArticles';
import type { ArticleMeta } from '@/stores/articleStatusStore';
import { colors } from '@/theme/colors';

interface PopularListProps {
  period: RankingPeriod;
  // ランキング表示では順位数字をleadingに渡す
  renderLeading?: (index: number) => ReactNode;
  onPressMenu: (article: ArticleMeta, favoriteFlg: boolean) => void;
}

// 人気記事リスト(Rankingタブ)。
// インフィード広告は入れない(広告はHomeの「新着」のみ)
export function PopularList({ period, renderLeading, onPressMenu }: PopularListProps) {
  const query = usePopularArticles(period);
  // サイトブロック+NGワード(順位数字はフィルタ後のindexで振り直し=欠番を作らない)
  const articles = useVisibleArticles(query.data ?? []);

  // 旧実装はエラー時も !query.data で永遠にスピナーが回り続けていた
  if (query.isError) {
    return (
      <ErrorState
        message={'読み込みに失敗しました。\n通信環境をご確認ください。'}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  if (articles.length === 0) {
    return <EmptyMessage message="表示できる記事がありません" />;
  }

  return (
    <FlashList
      data={articles}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      renderItem={({ item, index }) => (
        <NewsCard
          article={item}
          leading={renderLeading?.(index)}
          source="popular"
          onPressMenu={onPressMenu}
        />
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
