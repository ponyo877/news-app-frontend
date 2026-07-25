import type { MaterialTopTabNavigationOptions } from '@react-navigation/material-top-tabs';

import { colors } from '@/theme/colors';
import { radius } from '@/theme/typography';

// 内側タブ(Home/Ranking/MyPage)共通の角丸ピル型indicator設定。
// 旧版: TabBar(indicatorSize: label, BorderRadius.circular(50), blueGrey)
export const innerTabScreenOptions: MaterialTopTabNavigationOptions = {
  tabBarStyle: {
    backgroundColor: colors.background,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBarIndicatorStyle: {
    backgroundColor: colors.blueGrey,
    height: 40,
    borderRadius: radius.pill,
    marginBottom: 4,
  },
  tabBarPressColor: 'transparent',
  tabBarActiveTintColor: colors.textPrimary,
  tabBarInactiveTintColor: colors.textSecondary,
  swipeEnabled: true,
};
