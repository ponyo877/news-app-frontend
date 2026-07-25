import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import { ConvexTabBar } from '@/components/ConvexTabBar';
import { HomeScreen } from '@/features/home/HomeScreen';
import { MyPageScreen } from '@/features/mypage/MyPageScreen';
import { RankingScreen } from '@/features/ranking/RankingScreen';
import { SearchScreen } from '@/features/search/SearchScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import type { MainTabsParamList } from '@/navigation/types';

const Tab = createMaterialTopTabNavigator<MainTabsParamList>();

// 5タブ本体。旧版: DefaultTabController(length:5, initialIndex:2)+ConvexAppBar。
// tabBarPosition:'bottom' のmaterial-top-tabsで左右スワイプも再現。
// lazyは無効(旧版は全Providerが起動時にロードされる挙動のため)
export function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBarPosition="bottom"
      screenOptions={{ swipeEnabled: true, lazy: false, animationEnabled: true }}
      tabBar={(props) => <ConvexTabBar {...props} />}
    >
      <Tab.Screen name="Ranking" component={RankingScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="MyPage" component={MyPageScreen} />
      <Tab.Screen name="Setting" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
