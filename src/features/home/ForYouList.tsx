import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';

import { useLatestArticles, usePopularArticles } from '@/api/queries';
import { fetchForYou, recentReadIds } from '@/api/recs';
import { ErrorState } from '@/components/ErrorState';
import { NewsCard } from '@/components/NewsCard';
import { computeSiteAffinity, dedupeById, rankForYou } from '@/lib/forYou';
import { useVisibleArticles } from '@/lib/useVisibleArticles';
import type { ArticleMeta } from '@/stores/articleStatusStore';
import { useArticleStatusStore } from '@/stores/articleStatusStore';
import { useSiteFilterStore } from '@/stores/siteFilterStore';
import { colors } from '@/theme/colors';

interface ForYouListProps {
  onPressMenu: (article: ArticleMeta, favoriteFlg: boolean) => void;
}

// for You タブ(旧版はdailyランキングの複製だった)。
// 第一候補: Cloudflare推薦基盤(閲覧履歴ベクトルのtopK検索)。
// 縮退: オフライン・Worker障害・履歴ゼロでは端末内リランク
// (Latest/Rankingタブとキャッシュ共有の3クエリを新着×人気×親和度でブレンド)。
// インフィード広告は入れない(広告はHomeの「新着」のみ・AdMob制約)
export function ForYouList({ onPressMenu }: ForYouListProps) {
  const historyCount = useArticleStatusStore((s) => s.history.length);

  const recsQuery = useQuery({
    queryKey: ['articles', 'foryou'],
    queryFn: () => fetchForYou(recentReadIds()),
    // 履歴ゼロ(コールドスタート)はユーザーベクトルを作れないので呼ばない
    enabled: historyCount > 0,
    retry: 1,
    staleTime: 5 * 60_000,
  });

  // フォールバック候補。Latest/Rankingタブと同一キャッシュ(追加リクエストは初回のみ)
  const latestQuery = useLatestArticles();
  const dailyQuery = usePopularArticles('daily');
  const weeklyQuery = usePopularArticles('weekly');

  const fallbackArticles = useMemo(() => {
    const candidates = dedupeById([
      ...(latestQuery.data?.pages ?? []).flatMap((page) => page.data),
      ...(dailyQuery.data ?? []),
      ...(weeklyQuery.data ?? []),
    ]);
    if (candidates.length === 0) {
      return [];
    }
    // 履歴・既読はスナップショットで読む(購読しない)。記事を読んで戻っても
    // 並びが飛ばないように、再計算はクエリdataの更新時だけに限定する。
    // 基準時刻はクエリ取得時刻(useMemo内でDate.nowを呼ばない=純粋関数維持)
    const now = Math.max(
      latestQuery.dataUpdatedAt,
      dailyQuery.dataUpdatedAt,
      weeklyQuery.dataUpdatedAt,
    );
    const status = useArticleStatusStore.getState();
    const affinity = computeSiteAffinity({
      history: status.history,
      favoriteSiteIds: Object.values(status.favorites).map((favorite) => favorite.siteID),
      preferredSiteIds: useSiteFilterStore.getState().preferredSiteIds,
      now,
    });
    return rankForYou(candidates, {
      affinity,
      readIds: status.readIds,
      dailyRank: new Map((dailyQuery.data ?? []).map((article, i) => [article.id, i])),
      weeklyRank: new Map((weeklyQuery.data ?? []).map((article, i) => [article.id, i])),
      // refetchごとに変わる決定的シード(表示中は順序安定)
      seed: (latestQuery.dataUpdatedAt ^ dailyQuery.dataUpdatedAt) >>> 0,
      now,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestQuery.data, dailyQuery.data, weeklyQuery.data]);

  const usingRecs = (recsQuery.data?.length ?? 0) > 0;
  const articles = useVisibleArticles(usingRecs ? (recsQuery.data ?? []) : fallbackArticles);

  const refreshing =
    recsQuery.isRefetching || latestQuery.isRefetching || dailyQuery.isRefetching;
  const onRefresh = () => {
    void Promise.all([
      historyCount > 0 ? recsQuery.refetch() : Promise.resolve(),
      latestQuery.refetch(),
      dailyQuery.refetch(),
      weeklyQuery.refetch(),
    ]);
  };

  if (articles.length === 0) {
    // 全ソース失敗のときだけエラー(1つでも生きていればリストが出る)
    if (latestQuery.isError && dailyQuery.isError && weeklyQuery.isError) {
      return (
        <ErrorState
          message={'読み込みに失敗しました。\n通信環境をご確認ください。'}
          onRetry={onRefresh}
        />
      );
    }
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
      renderItem={({ item }) => (
        <NewsCard article={item} source="foryou" onPressMenu={onPressMenu} />
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.textPrimary}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
