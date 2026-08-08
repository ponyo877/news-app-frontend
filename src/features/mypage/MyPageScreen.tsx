import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { EmptyMessage } from '@/components/EmptyMessage';
import { NewsCard } from '@/components/NewsCard';
import { PillTabBar } from '@/components/PillTabBar';
import type { ArticleOpenFrom } from '@/navigation/types';
import { ArticleMeta, useArticleStatusStore } from '@/stores/articleStatusStore';
import { colors } from '@/theme/colors';
import { innerTabScreenOptions } from '@/theme/innerTabs';
import { fontFamily, fontSize } from '@/theme/typography';

const Tab = createMaterialTopTabNavigator();

// My Pageタブ(旧HistoryPostScreen): History / Favorite。
// ストア直読み・新しい順、カードは既読/お気に入り表現なし(旧NewsHistoryCard相当)
export function MyPageScreen() {
  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={innerTabScreenOptions}
        tabBar={(props) => <PillTabBar {...props} />}
      >
        <Tab.Screen name="History" options={{ tabBarLabel: labelRenderer('履歴') }}>
          {() => <HistoryList />}
        </Tab.Screen>
        <Tab.Screen name="Favorite" options={{ tabBarLabel: labelRenderer('お気に入り') }}>
          {() => <FavoriteList />}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
}

function labelRenderer(label: string) {
  return function TabLabel({ color }: { color: string }) {
    return <Text style={[styles.tabLabel, { color }]}>{label}</Text>;
  };
}

function HistoryList() {
  const history = useArticleStatusStore((s) => s.history);
  const items = useMemo(() => [...history].reverse(), [history]);
  if (items.length === 0) {
    return <EmptyMessage message="閲覧履歴はありません" />;
  }
  return <PlainArticleList items={items} source="history" />;
}

function FavoriteList() {
  const favorites = useArticleStatusStore((s) => s.favorites);
  const items = useMemo(() => Object.values(favorites).reverse(), [favorites]);
  if (items.length === 0) {
    return <EmptyMessage message="お気に入りはありません" />;
  }
  return <PlainArticleList items={items} source="favorite" />;
}

function PlainArticleList({ items, source }: { items: ArticleMeta[]; source: ArticleOpenFrom }) {
  return (
    <FlashList
      data={items}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      renderItem={({ item }) => <NewsCard article={item} plain source={source} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabLabel: {
    fontSize: fontSize.sectionLabel,
    fontFamily: fontFamily.regular,
  },
});
