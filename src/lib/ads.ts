import { Platform } from 'react-native';
import mobileAds, { TestIds } from 'react-native-google-mobile-ads';

// 既存ストアアプリと同一の本番バナーユニットID(変更禁止)。デバッグ時はGoogleテストID。
const PROD_BANNER_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-6803082941924637/7700310633',
  android: 'ca-app-pub-6803082941924637/9130223639',
  default: TestIds.BANNER,
});

export const bannerAdUnitId = __DEV__ ? TestIds.BANNER : PROD_BANNER_UNIT_ID;

// AdMob SDK初期化(旧版のMobileAds.instance.initialize()相当)。失敗しても起動は継続
export async function initializeAds(): Promise<void> {
  try {
    await mobileAds().initialize();
  } catch {
    // no-op
  }
}
