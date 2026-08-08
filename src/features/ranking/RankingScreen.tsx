import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { StyleSheet, Text, View } from 'react-native';

import type { RankingPeriod } from '@/api/endpoints';
import { PillTabBar } from '@/components/PillTabBar';
import { PopularList } from '@/features/home/PopularList';
import { useArticleActionSheet } from '@/features/article/useArticleActionSheet';
import { colors } from '@/theme/colors';
import { innerTabScreenOptions } from '@/theme/innerTabs';
import { fontFamily, fontSize } from '@/theme/typography';

const Tab = createMaterialTopTabNavigator();

// labelのみ日本語(name=ルート名はGA4 screen_viewの連続性のため不変)
const PERIODS: { name: string; label: string; period: RankingPeriod }[] = [
  { name: 'Daily', label: '日間', period: 'daily' },
  { name: 'Weekly', label: '週間', period: 'weekly' },
  { name: 'Monthly', label: '月間', period: 'monthly' },
];

// Rankingタブ(旧RankingPostScreen): Daily/Weekly/Monthlyの3タブ、
// カードのサムネイル位置に順位数字(30px)を表示
export function RankingScreen() {
  const { openSheet, sheet } = useArticleActionSheet();

  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={innerTabScreenOptions}
        tabBar={(props) => <PillTabBar {...props} />}
      >
        {PERIODS.map(({ name, label, period }) => (
          <Tab.Screen
            key={name}
            name={name}
            options={{
              tabBarLabel: ({ color }) => (
                <Text style={[styles.tabLabel, { color }]}>{label}</Text>
              ),
            }}
          >
            {() => (
              <PopularList
                period={period}
                renderLeading={(index) => <Text style={styles.rank}>{index + 1}</Text>}
                onPressMenu={openSheet}
              />
            )}
          </Tab.Screen>
        ))}
      </Tab.Navigator>
      {sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabLabel: {
    fontSize: fontSize.sectionLabel,
    fontFamily: fontFamily.regular,
  },
  rank: {
    fontSize: fontSize.rankNumber,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
  },
});
