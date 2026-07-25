import type { ExpoConfig } from 'expo/config';

// AdMob: 既存ストアアプリと同一のアプリID(変更禁止)
const ADMOB_ANDROID_APP_ID = 'ca-app-pub-6803082941924637~1899149618';
const ADMOB_IOS_APP_ID = 'ca-app-pub-6803082941924637~3022699020';

const config: ExpoConfig = {
  name: 'まとめくん',
  slug: 'matome-kun',
  version: '1.43',
  orientation: 'portrait',
  icon: './assets/app/icon-1024.png',
  userInterfaceStyle: 'dark',
  ios: {
    // 既存App Storeアプリと同一(ハイフン)。Androidと文字列が異なる点に注意
    bundleIdentifier: 'com.matomebeta-app',
    supportsTablet: true,
    requireFullScreen: true,
    infoPlist: {
      CFBundleDisplayName: 'まとめくん',
      // まとめサイトの一部がHTTPのみ対応のため全面許可(機能要件)
      NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
      'UISupportedInterfaceOrientations~ipad': [
        'UIInterfaceOrientationPortrait',
        'UIInterfaceOrientationPortraitUpsideDown',
        'UIInterfaceOrientationLandscapeLeft',
        'UIInterfaceOrientationLandscapeRight',
      ],
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    // 既存Playアプリと同一(アンダースコア)
    package: 'com.matomebeta_app',
    adaptiveIcon: {
      foregroundImage: './assets/app/adaptive-foreground.png',
      backgroundColor: '#E0AEE7',
    },
    permissions: ['com.google.android.gms.permission.AD_ID'],
  },
  plugins: [
    'expo-dev-client',
    [
      'expo-build-properties',
      {
        android: {
          // まとめサイトのHTTP通信許可(iOSのATS無効と対)
          usesCleartextTraffic: true,
        },
        ios: {
          deploymentTarget: '16.0',
        },
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#ffffff',
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: ADMOB_ANDROID_APP_ID,
        iosAppId: ADMOB_IOS_APP_ID,
      },
    ],
  ],
};

export default config;
