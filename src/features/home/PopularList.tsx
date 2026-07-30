import { FlashList } from '@shopify/flash-list';
import { useMemo, type ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';

import { RankingPeriod } from '@/api/endpoints';
import { usePopularArticles } from '@/api/queries';
import { FeedAdCard } from '@/components/FeedAdCard';
import { NewsCard } from '@/components/NewsCard';
import { withFeedAds } from '@/lib/feedAds';
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
  // 一定間隔でインフィード広告を差し込む(記事画面の常時バナーの置き換え)。
  // フックは早期returnより前で呼ぶ必要があるため、データ未取得時は空配列で計算する
  const entries = useMemo(
    () => withFeedAds(query.data ?? [], (article, index) => `${article.id}-${index}`),
    [query.data],
  );

  if (query.isLoading || !query.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <FlashList
      data={entries}
      keyExtractor={(item) => item.key}
      // 記事カードと広告カードは高さが違うため、種別を伝えてリサイクルを分ける
      getItemType={(item) => item.type}
      renderItem={({ item }) =>
        item.type === 'ad' ? (
          <FeedAdCard />
        ) : (
          // 順位は広告を除いた元の並び順(item.index)で数える
          <NewsCard
            article={item.article}
            leading={renderLeading?.(item.index)}
            onPressMenu={onPressMenu}
          />
        )
      }
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
