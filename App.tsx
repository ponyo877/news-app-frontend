import {
  MPLUSRounded1c_400Regular,
  MPLUSRounded1c_500Medium,
  MPLUSRounded1c_700Bold,
  useFonts,
} from '@expo-google-fonts/m-plus-rounded-1c';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queries';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initializeAds } from '@/lib/ads';
import { logError } from '@/lib/analytics';
import { bootstrapUser } from '@/lib/bootstrap';
import { configureNotificationHandler, syncPushTokenIfGranted } from '@/lib/notifications';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useNotificationStore } from '@/stores/notificationStore';
import { useReviewStore } from '@/stores/reviewStore';

// フォント読み込みが終わるまでスプラッシュを保持する。
// 従来は制御していなかったため「スプラッシュが消えた後の白画面」が起動のたびに見えていた
SplashScreen.preventAutoHideAsync().catch(() => {});

// フォアグラウンド受信時の通知表示方法(通知タップの遷移はRootNavigator側)
configureNotificationHandler();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    MPLUSRounded1c_400Regular,
    MPLUSRounded1c_500Medium,
    MPLUSRounded1c_700Bold,
  });
  // フォント読み込み失敗時はシステムフォントで起動を続行する(白画面で固まるより良い)
  const appReady = fontsLoaded || fontError != null;

  useEffect(() => {
    void initializeAds();
    // 初回起動の案内はオンボーディング画面(RootNavigator側で表示)に吸収した
    bootstrapUser().catch((error) => {
      // 起動処理の失敗でアプリを止めない(次回起動時に再試行される)
      logError(error, 'bootstrapUser');
    });
    // レビュー依頼の起点時刻(初回起動 or 1.48更新後の初起動)
    useReviewStore.getState().ensureInstallAt();
    // 許諾済み端末のみ: トークンローテーションに追随してサーバへ再登録
    const notificationPrefs = useNotificationStore.getState();
    void syncPushTokenIfGranted(notificationPrefs.digestEnabled, notificationPrefs.matsuriEnabled);
  }, []);

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <RootNavigator />
          </ErrorBoundary>
          <StatusBar style="light" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
