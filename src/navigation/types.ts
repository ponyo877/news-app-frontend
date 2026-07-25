import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { ArticleMeta } from '@/stores/articleStatusStore';

export type RootStackParamList = {
  MainTabs: undefined;
  Article: { article: ArticleMeta };
  NormalWebView: { title: string; url: string };
  SelectSites: undefined;
  SelectAvatar: undefined;
};

export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

export type MainTabsParamList = {
  Ranking: undefined;
  Search: undefined;
  Home: undefined;
  MyPage: undefined;
  Setting: undefined;
};
