import {
  MPLUSRounded1c_400Regular,
  MPLUSRounded1c_500Medium,
  MPLUSRounded1c_700Bold,
  useFonts,
} from '@expo-google-fonts/m-plus-rounded-1c';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queries';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { InfoDialog } from '@/components/InfoDialog';
import { initializeAds } from '@/lib/ads';
import { logError } from '@/lib/analytics';
import { bootstrapUser } from '@/lib/bootstrap';
import { RootNavigator } from '@/navigation/RootNavigator';

// フォント読み込みが終わるまでスプラッシュを保持する。
// 従来は制御していなかったため「スプラッシュが消えた後の白画面」が起動のたびに見えていた
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    MPLUSRounded1c_400Regular,
    MPLUSRounded1c_500Medium,
    MPLUSRounded1c_700Bold,
  });
  // フォント読み込み失敗時はシステムフォントで起動を続行する(白画面で固まるより良い)
  const appReady = fontsLoaded || fontError != null;
  const [showFirstLaunchDialog, setShowFirstLaunchDialog] = useState(false);

  useEffect(() => {
    void initializeAds();
    bootstrapUser()
      .then((result) => setShowFirstLaunchDialog(result.isFirstLaunch))
      .catch((error) => {
        // 起動処理の失敗でアプリを止めない(次回起動時に再試行される)
        logError(error, 'bootstrapUser');
      });
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
          <InfoDialog
            visible={showFirstLaunchDialog}
            title="ユーザ名とアイコンが設定できます"
            message="設定画面からユーザ名とアイコンを設定してください。"
            onClose={() => setShowFirstLaunchDialog(false)}
          />
          <StatusBar style="light" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
