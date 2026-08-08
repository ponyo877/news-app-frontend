import {
  DarkTheme,
  NavigationContainer,
  Theme,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';

import { NotificationPromptDialog } from '@/components/NotificationPromptDialog';
import { ArticleScreen } from '@/features/article/ArticleScreen';
import { SelectAvatarScreen } from '@/features/settings/SelectAvatarScreen';
import { SelectSitesScreen } from '@/features/settings/SelectSitesScreen';
import { NormalWebViewScreen } from '@/features/webview/NormalWebViewScreen';
import { logEvent, logScreenView } from '@/lib/analytics';
import { parseNotificationArticle, requestPermissionAndRegister } from '@/lib/notifications';
import { MainTabs } from '@/navigation/MainTabs';
import type { RootStackParamList } from '@/navigation/types';
import type { ArticleMeta } from '@/stores/articleStatusStore';
import { useArticleStatusStore } from '@/stores/articleStatusStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.appBar,
    text: colors.textPrimary,
    border: colors.appBar,
  },
};

// プレ許諾を出す既読記事数のしきい値(価値を体感してから聞く。初回起動では出さない)
const NOTIFICATION_PROMPT_READ_COUNT = 3;

export function RootNavigator() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const routeNameRef = useRef<string | undefined>(undefined);
  // ナビゲーション準備前(kill状態から通知タップで起動)に届いた遷移先の待避場所
  const pendingArticleRef = useRef<ArticleMeta | null>(null);
  const handledNotificationRef = useRef<string | null>(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  const openArticleFromNotification = (response: Notifications.NotificationResponse) => {
    // listenerとgetLastNotificationResponseAsyncが同じ通知を二重に流しても1回だけ処理する
    const identifier = response.notification.request.identifier;
    if (handledNotificationRef.current === identifier) {
      return;
    }
    handledNotificationRef.current = identifier;
    const data = response.notification.request.content.data as Record<string, unknown>;
    const article = parseNotificationArticle(data);
    if (!article) {
      return;
    }
    logEvent('notification_open', { type: typeof data.type === 'string' ? data.type : 'unknown' });
    if (navigationRef.isReady()) {
      navigationRef.navigate('Article', { article });
    } else {
      pendingArticleRef.current = article;
    }
  };

  useEffect(() => {
    const subscription =
      Notifications.addNotificationResponseReceivedListener(openArticleFromNotification);
    // kill状態からの通知タップ起動はlistener登録前に発生しているため、こちらで拾う
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        openArticleFromNotification(response);
      }
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GA4のscreen_view。material-top-tabsの内側タブ(Latest/for You等)も
  // getCurrentRoute()がフォーカス中のルート名として返すため、タブ別利用率が取れる
  const trackScreen = () => {
    const currentRouteName = navigationRef.getCurrentRoute()?.name;
    if (currentRouteName && currentRouteName !== routeNameRef.current) {
      routeNameRef.current = currentRouteName;
      logScreenView(currentRouteName);
    }
    maybeShowNotificationPrompt(currentRouteName);
  };

  // 通知のプレ許諾: 記事を3本読み終えてタブ一覧に戻った瞬間に1回だけ出す。
  // 記事閲覧中(Article)には被せない
  const maybeShowNotificationPrompt = (currentRouteName: string | undefined) => {
    if (showNotificationPrompt || currentRouteName === 'Article') {
      return;
    }
    if (useNotificationStore.getState().promptDone) {
      return;
    }
    const readCount = Object.keys(useArticleStatusStore.getState().readIds).length;
    if (readCount >= NOTIFICATION_PROMPT_READ_COUNT) {
      setShowNotificationPrompt(true);
    }
  };

  const onAcceptNotification = () => {
    setShowNotificationPrompt(false);
    useNotificationStore.getState().setPromptDone();
    logEvent('notification_prompt', { action: 'accept' });
    void requestPermissionAndRegister(useNotificationStore.getState().digestEnabled);
  };

  const onDeclineNotification = () => {
    setShowNotificationPrompt(false);
    useNotificationStore.getState().setPromptDone();
    logEvent('notification_prompt', { action: 'decline' });
  };

  const onNavigationReady = () => {
    trackScreen();
    if (pendingArticleRef.current) {
      navigationRef.navigate('Article', { article: pendingArticleRef.current });
      pendingArticleRef.current = null;
    }
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      onReady={onNavigationReady}
      onStateChange={trackScreen}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.appBar },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontFamily: fontFamily.medium },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ title: '😁まとめくん😁', headerTitleAlign: 'center' }}
        />
        <Stack.Screen
          name="Article"
          component={ArticleScreen}
          options={({ route }) => ({ title: route.params.article.titles })}
        />
        <Stack.Screen
          name="NormalWebView"
          component={NormalWebViewScreen}
          options={({ route }) => ({ title: route.params.title })}
        />
        <Stack.Screen
          name="SelectSites"
          component={SelectSitesScreen}
          options={{ title: '表示サイトの選択' }}
        />
        <Stack.Screen
          name="SelectAvatar"
          component={SelectAvatarScreen}
          options={{ title: '画像の選択' }}
        />
      </Stack.Navigator>
      <NotificationPromptDialog
        visible={showNotificationPrompt}
        onAccept={onAcceptNotification}
        onDecline={onDeclineNotification}
      />
    </NavigationContainer>
  );
}
