import { FlashList } from '@shopify/flash-list';
import { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';

import { useLatestArticles } from '@/api/queries';
import { ErrorState } from '@/components/ErrorState';
import { FeedAdCard } from '@/components/FeedAdCard';
import { NewsCard } from '@/components/NewsCard';
import { withFeedAds } from '@/lib/feedAds';
import { balanceSitePage } from '@/lib/siteBalance';
import { useVisibleArticles } from '@/lib/useVisibleArticles';
import type { ArticleMeta } from '@/stores/articleStatusStore';
import { colors } from '@/theme/colors';

interface LatestListProps {
  onPressMenu: (article: ArticleMeta, favoriteFlg: boolean) => void;
}

// 新着記事の無限スクロール(lastPublishedAtカーソル)。
// 旧版のitemBuilder内getPost(false)呼び出しはonEndReachedに置き換え(多重リクエスト是正)
export function LatestList({ onPressMenu }: LatestListProps) {
  const query = useLatestArticles();
  const rawArticles = useMemo(
    // ページ単位のサイト別バランシング(上位3サイト48%占有の緩和。並べ替えのみで記事は失わない)
    () => (query.data?.pages ?? []).flatMap((page) => balanceSitePage(page.data)),
    [query.data],
  );
  // NGワード(サイトブロックはサーバのskipIDsでも効くが二重で無害)
  const articles = useVisibleArticles(rawArticles);
  // 一定間隔でインフィード広告を差し込む(記事画面の常時バナーの置き換え)
  const entries = useMemo(
    () => withFeedAds(articles, (article, index) => `${article.id}-${index}`),
    [articles],
  );

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  // エラー時に無言の空リストを出さない(1ページ目の失敗のみ。2ページ目以降の失敗は取得済み分を表示)
  if (query.isError && articles.length === 0) {
    return (
      <ErrorState
        message={'読み込みに失敗しました。\n通信環境をご確認ください。'}
        onRetry={() => void query.refetch()}
      />
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
          <NewsCard article={item.article} source="latest" onPressMenu={onPressMenu} />
        )
      }
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
