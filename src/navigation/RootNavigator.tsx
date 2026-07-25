import { DarkTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ArticleScreen } from '@/features/article/ArticleScreen';
import { SelectAvatarScreen } from '@/features/settings/SelectAvatarScreen';
import { SelectSitesScreen } from '@/features/settings/SelectSitesScreen';
import { NormalWebViewScreen } from '@/features/webview/NormalWebViewScreen';
import { MainTabs } from '@/navigation/MainTabs';
import type { RootStackParamList } from '@/navigation/types';
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

export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
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
    </NavigationContainer>
  );
}
