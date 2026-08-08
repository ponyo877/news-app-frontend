import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import type { ExpoConfig } from 'expo/config';
import { withDangerousMod, type ConfigPlugin } from 'expo/config-plugins';

// AdMob: 既存ストアアプリと同一のアプリID(変更禁止)
const ADMOB_ANDROID_APP_ID = 'ca-app-pub-6803082941924637~1899149618';
const ADMOB_IOS_APP_ID = 'ca-app-pub-6803082941924637~3022699020';

// Firebase(Analytics + Crashlytics)。設定ファイル2点をFirebaseコンソールから
// ダウンロードしてリポジトリ直下に置くと有効化される(docs/RELEASE.md参照)。
// 未配置でもビルド・動作は従来どおり(src/lib/analytics.ts が no-op に落ちる)
const GOOGLE_SERVICES_ANDROID = './google-services.json';
const GOOGLE_SERVICES_IOS = './GoogleService-Info.plist';
const hasFirebaseConfig = existsSync(GOOGLE_SERVICES_ANDROID) && existsSync(GOOGLE_SERVICES_IOS);

// RNFirebase v26のSPM解決はdynamic linkage必須で、Expoの静的構成では
// 「SPM + static linkage is not supported」でpod installが失敗する。
// SPMを無効化してCocoaPods配布のFirebaseに落とす(useFrameworks: static とセットの実績構成)
const withRNFirebaseDisableSPM: ConfigPlugin = (config) =>
  withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = join(cfg.modRequest.platformProjectRoot, 'Podfile');
      const podfile = readFileSync(podfilePath, 'utf8');
      if (!podfile.includes('$RNFirebaseDisableSPM')) {
        writeFileSync(podfilePath, `$RNFirebaseDisableSPM = true\n${podfile}`);
      }
      return cfg;
    },
  ]);

// 旧Info.plistの50件を移植(pluginは自動注入しないため明示指定が必要)。
// 旧plistに混入していた末尾スペースは正規化済み
const SK_AD_NETWORK_ITEMS = [
  '22mmun2rn5.skadnetwork',
  '2fnua5tdw4.skadnetwork',
  '2u9pt9hc89.skadnetwork',
  '3qcr597p9d.skadnetwork',
  '3qy4746246.skadnetwork',
  '3rd42ekr43.skadnetwork',
  '3sh42y64q3.skadnetwork',
  '424m5254lk.skadnetwork',
  '4468km3ulz.skadnetwork',
  '47vhws6wlr.skadnetwork',
  '4dzt52r2t5.skadnetwork',
  '4fzdc2evr5.skadnetwork',
  '4pfyvq9l8r.skadnetwork',
  '578prtvx9j.skadnetwork',
  '5a6flpkh64.skadnetwork',
  '7ug5zh24hu.skadnetwork',
  '8c4e2ghe7u.skadnetwork',
  '8s468mfl3y.skadnetwork',
  '9rd848q2bz.skadnetwork',
  '9t245vhmpl.skadnetwork',
  'a2p9lx4jpn.skadnetwork',
  'av6w8kgt66.skadnetwork',
  'c6k4g5qg8m.skadnetwork',
  'cp8zw746q7.skadnetwork',
  'cstr6suwn9.skadnetwork',
  'e5fvkxwrpn.skadnetwork',
  'ecpz2srf59.skadnetwork',
  'f38h382jlk.skadnetwork',
  'gta9lk7p23.skadnetwork',
  'hs6bdukanm.skadnetwork',
  'kbd757ywx3.skadnetwork',
  'klf5c3l5u5.skadnetwork',
  'ludvb6z3bs.skadnetwork',
  'mlmmfzh3r3.skadnetwork',
  'n38lu8286q.skadnetwork',
  'n6fk4nfna4.skadnetwork',
  'p78axxw29g.skadnetwork',
  'ppxm28t8ap.skadnetwork',
  'prcb7njmu6.skadnetwork',
  's39g8k73mm.skadnetwork',
  't38b2kh725.skadnetwork',
  'uw77j35x4d.skadnetwork',
  'v4nxqhlyqp.skadnetwork',
  'v72qych5uu.skadnetwork',
  'v9wttpbfk9.skadnetwork',
  'wzmmz9fp6w.skadnetwork',
  'y5ghdn5j9k.skadnetwork',
  'yclnxrl5pm.skadnetwork',
  'ydx93a7ass.skadnetwork',
  'zq492l623r.skadnetwork',
];

const config: ExpoConfig = {
  name: 'まとめくん',
  slug: 'matome-kun',
  version: '1.48',
  // 共有着地ページ(matome.folks-chat.com/a/{id})の「アプリで開く」用スキーム
  scheme: 'matomekun',
  extra: {
    eas: { projectId: '2d486ee4-ba33-45bd-ba1b-a2d421d7de97' },
  },
  orientation: 'portrait',
  icon: './assets/app/icon-1024.png',
  userInterfaceStyle: 'dark',
  ios: {
    // 既存App Storeアプリと同一(ハイフン)。Androidと文字列が異なる点に注意
    bundleIdentifier: 'com.matomebeta-app',
    // 旧版の最終build 42より大きい値。リリースごとに手動で+1する(docs/RELEASE.md参照)。
    buildNumber: '51',
    ...(hasFirebaseConfig ? { googleServicesFile: GOOGLE_SERVICES_IOS } : {}),
    // Universal Links(/.well-known/apple-app-site-associationは配信済み)。
    // ios/は未コミット=EASリモートprebuildなのでこの宣言だけでentitlementsに反映される
    associatedDomains: ['applinks:matome.folks-chat.com'],
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
    // App Store 2024年〜要件: 自アプリコードが使うRequired Reason APIの申告。
    // UserDefaults(NSUserDefaults/Settings経由のレガシー移行読み取り)= CA92.1(自アプリ専用アクセス)
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
      ],
    },
  },
  android: {
    // 既存Playアプリと同一(アンダースコア)
    package: 'com.matomebeta_app',
    // Play製品版の最新vc44より大きい値。リリースごとに手動で+1する(docs/RELEASE.md参照)。
    versionCode: 53,
    ...(hasFirebaseConfig ? { googleServicesFile: GOOGLE_SERVICES_ANDROID } : {}),
    adaptiveIcon: {
      foregroundImage: './assets/app/adaptive-foreground.png',
      backgroundColor: '#E0AEE7',
    },
    // App Links(/.well-known/assetlinks.jsonは配信済み)。
    // 注意: android/はコミット済みでprebuildが再実行されないため、実際の反映は
    // AndroidManifest.xmlの直編集が正。ここは将来prebuildし直す時の正本として併記
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: 'matome.folks-chat.com', pathPrefix: '/a' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    permissions: ['com.google.android.gms.permission.AD_ID'],
  },
  plugins: [
    'expo-dev-client',
    [
      'expo-notifications',
      {
        // Androidのステータスバー通知アイコンは白シルエット必須(カラー画像だと白四角になる)。
        // adaptive-foregroundの白背景を透明化して生成した(吹き出し+笑顔)
        icon: './assets/app/notification-icon.png',
        color: '#E0AEE7',
      },
    ],
    // Firebase設定ファイルがあるときのみネイティブ組み込みを行う(analyticsはapp同梱のためplugin不要)
    ...(hasFirebaseConfig ? ['@react-native-firebase/app', '@react-native-firebase/crashlytics'] : []),
    [
      'expo-build-properties',
      {
        android: {
          // まとめサイトのHTTP通信許可(iOSのATS無効と対)
          usesCleartextTraffic: true,
          // Google Play 2026年要件(2026-08-31以降の更新はAPI 36必須)を確実に満たす
          compileSdkVersion: 36,
          targetSdkVersion: 36,
        },
        // iOS deploymentTargetはSDK既定(16.4+)に従う。
        // 旧版は16.0だったがExpo SDK 57の下限が16.4のため、iOS 16.0-16.3端末は更新対象外になる
        // Firebase(CocoaPods配布・SPM無効)はstatic frameworksが必要。
        // withRNFirebaseDisableSPM とセットで従来から実績のある構成にしている
        ...(hasFirebaseConfig ? { ios: { useFrameworks: 'static' as const } } : {}),
      },
    ],
    [
      'expo-splash-screen',
      {
        // 旧版は白一色のスプラッシュ。中央にアプリアイコンを置いて同等以上に。
        // 画像を指定しないとAndroidでsplashscreen_logoドローアブルが生成されず
        // resource linkingに失敗するため、画像指定は必須
        backgroundColor: '#ffffff',
        image: './assets/app/icon-1024.png',
        imageWidth: 200,
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: ADMOB_ANDROID_APP_ID,
        iosAppId: ADMOB_IOS_APP_ID,
        skAdNetworkItems: SK_AD_NETWORK_ITEMS,
      },
    ],
    [
      'expo-tracking-transparency',
      {
        userTrackingPermission:
          '広告をあなたにとってより関連性の高いものにするため、トラッキングの許可をお願いします。許可しない場合も広告は表示されます。',
      },
    ],
  ],
};

// 関数プラグインはExpoConfig型のplugins配列に載らないため、エクスポート時に適用する
export default hasFirebaseConfig ? withRNFirebaseDisableSPM(config) : config;
