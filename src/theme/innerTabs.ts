import type { MaterialTopTabNavigationOptions } from '@react-navigation/material-top-tabs';

// 内側タブ(Home/Ranking/MyPage)共通設定。
// 見た目はPillTabBar(FlutterのindicatorSize: label再現)が担うため、ここでは挙動のみ
export const innerTabScreenOptions: MaterialTopTabNavigationOptions = {
  swipeEnabled: true,
};
