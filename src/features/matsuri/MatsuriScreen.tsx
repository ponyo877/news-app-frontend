import { FlashList } from '@shopify/flash-list';
import { useEffect } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useMatsuri } from '@/api/queries';
import type { MatsuriCluster } from '@/api/recs';
import { EmptyMessage } from '@/components/EmptyMessage';
import { NewsCard } from '@/components/NewsCard';
import { logEvent } from '@/lib/analytics';
import { useVisibleArticles } from '@/lib/useVisibleArticles';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

// 祭り一覧(複数サイトが同一スレを一斉にまとめたクラスタの読み比べ)。
// 通知タップ・ホームヘッダー🔥・新着バッジから遷移する
export function MatsuriScreen() {
  const query = useMatsuri();

  useEffect(() => {
    logEvent('matsuri_open');
  }, []);

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  const clusters = query.data ?? [];
  if (clusters.length === 0) {
    return (
      <EmptyMessage message={'いま進行中の祭りはありません。\n複数のまとめサイトが同じスレを\n一斉にまとめると、ここに表示されます。'} />
    );
  }

  return (
    <FlashList
      data={clusters}
      keyExtractor={(cluster) => cluster.clusterId}
      renderItem={({ item }) => <MatsuriClusterCard cluster={item} />}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          tintColor={colors.textPrimary}
        />
      }
      contentContainerStyle={styles.list}
    />
  );
}

function MatsuriClusterCard({ cluster }: { cluster: MatsuriCluster }) {
  // NGワード・サイトブロックは祭り一覧にも効かせる
  const articles = useVisibleArticles(cluster.articles);
  if (articles.length === 0) {
    return null;
  }
  return (
    <View style={styles.cluster}>
      <Text style={styles.clusterHeading}>
        🔥 {cluster.siteCount}サイトが一斉にまとめ中 — 読み比べ
      </Text>
      {articles.map((article) => (
        <NewsCard key={article.id} article={article} source="matsuri" />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    paddingVertical: 8,
  },
  cluster: {
    marginBottom: 20,
  },
  clusterHeading: {
    color: colors.amber,
    fontFamily: fontFamily.bold,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
});
