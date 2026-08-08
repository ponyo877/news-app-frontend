import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { ArticleMeta } from '@/stores/articleStatusStore';

// article_openの導線内訳(GROWTH-PLAN §2-1)。for Youの効果測定に使う
export type ArticleOpenFrom =
  | 'latest'
  | 'foryou'
  | 'popular'
  | 'search'
  | 'similar'
  | 'history'
  | 'favorite'
  | 'notification'
  | 'deeplink';

export type RootStackParamList = {
  MainTabs: undefined;
  Article: { article: ArticleMeta; from?: ArticleOpenFrom };
  NormalWebView: { title: string; url: string };
  SelectSites: undefined;
  SelectAvatar: undefined;
  NgWords: undefined;
  Onboarding: undefined;
};

export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

export type MainTabsParamList = {
  Ranking: undefined;
  Search: undefined;
  Home: undefined;
  MyPage: undefined;
  Setting: undefined;
};
