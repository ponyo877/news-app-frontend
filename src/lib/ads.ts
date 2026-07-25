import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { Platform } from 'react-native';
import mobileAds, {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  TestIds,
} from 'react-native-google-mobile-ads';

// 既存ストアアプリと同一の本番バナーユニットID(変更禁止)。デバッグ時はGoogleテストID。
const PROD_BANNER_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-6803082941924637/7700310633',
  android: 'ca-app-pub-6803082941924637/9130223639',
  default: TestIds.BANNER,
});

export const bannerAdUnitId = __DEV__ ? TestIds.BANNER : PROD_BANNER_UNIT_ID;

let initialized = false;

// AdMobの2026年要件に沿った初期化:
// 1. UMP(Google認定CMP)で同意取得 — EEA/UK配信時のGDPR要件。
//    フォームの内容はAdMob管理画面の「プライバシーとメッセージ」で公開しておく必要がある
// 2. iOSはATT許可プロンプト(UMP同意の後に表示するのがGoogle推奨順序)
// 3. SDK初期化。同意が得られない場合もUMPの設定に従い非パーソナライズ広告で継続
export async function initializeAds(): Promise<void> {
  if (initialized) {
    return;
  }
  try {
    await AdsConsent.gatherConsent();
  } catch {
    // 同意フォーム取得失敗(オフライン等)でも起動は継続
  }
  if (Platform.OS === 'ios') {
    try {
      await requestTrackingPermissionsAsync();
    } catch {
      // ATT非対応環境では無視
    }
  }
  try {
    await mobileAds().initialize();
    initialized = true;
  } catch {
    // 広告初期化失敗はアプリの機能に影響させない
  }
}

// GDPR対象ユーザーには同意の再変更手段(プライバシーオプション)の常設導線が必要
export async function isAdsPrivacyOptionsRequired(): Promise<boolean> {
  try {
    const info = await AdsConsent.getConsentInfo();
    return (
      info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
    );
  } catch {
    return false;
  }
}

export async function showAdsPrivacyOptionsForm(): Promise<void> {
  try {
    await AdsConsent.showPrivacyOptionsForm();
  } catch {
    // フォーム非公開・非対象地域では無視
  }
}
