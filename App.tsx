import {
  MPLUSRounded1c_400Regular,
  MPLUSRounded1c_500Medium,
  MPLUSRounded1c_700Bold,
  useFonts,
} from '@expo-google-fonts/m-plus-rounded-1c';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queries';
import { InfoDialog } from '@/components/InfoDialog';
import { initializeAds } from '@/lib/ads';
import { bootstrapUser } from '@/lib/bootstrap';
import { RootNavigator } from '@/navigation/RootNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({
    MPLUSRounded1c_400Regular,
    MPLUSRounded1c_500Medium,
    MPLUSRounded1c_700Bold,
  });
  const [showFirstLaunchDialog, setShowFirstLaunchDialog] = useState(false);

  useEffect(() => {
    void initializeAds();
    bootstrapUser()
      .then((result) => setShowFirstLaunchDialog(result.isFirstLaunch))
      .catch(() => {
        // 起動処理の失敗でアプリを止めない(次回起動時に再試行される)
      });
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RootNavigator />
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
