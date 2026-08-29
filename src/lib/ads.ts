import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { Platform } from 'react-native';
import mobileAds, {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  MaxAdContentRating,
  TestIds,
} from 'react-native-google-mobile-ads';

// 既存ストアアプリと同一の本番バナーユニットID(変更禁止)。それ以外はGoogleテストID。
const PROD_BANNER_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-6803082941924637/7700310633',
  android: 'ca-app-pub-6803082941924637/9130223639',
  default: TestIds.BANNER,
});

// 本番ユニットを使うのはストアへ出す production ビルドだけ。
//
// 【重要】以前は `__DEV__` だけで判定していたため、preview(内部配布APK)や
// 内部テスト版も release ビルド = `__DEV__ === false` となり、
// 開発者自身の動作確認が本番ユニットにインプレッションを送っていた。
// これは「無効なクリックとインプレッション」としてアカウント停止に直結する
// (2026-08-15にアカウント全体が停止。docs/REMAINING_TASKS.md 参照)。
// 設定漏れのときはテスト広告に倒す — 収益が出ないのはすぐ気づけるが、
// 本番ユニットへの誤トラフィックは取り返しがつかない
const usesProductionAds = process.env.EXPO_PUBLIC_ADS_ENV === 'production';

export const bannerAdUnitId = usesProductionAds ? PROD_BANNER_UNIT_ID : TestIds.BANNER;

// ストア用の動画・スクリーンショットを撮るビルド専用: 広告枠も同意フォーム(UMP/ATT)も出さない。
// `EXPO_PUBLIC_ADS_ENV=off` を付けてローカルビルドしたときだけ真になる(ストアビルドは未設定なので常に偽)。
// テスト広告の「Test mode」バナーが映像に写り込むのを防ぐため(promo/README.md)
export const adsHidden = process.env.EXPO_PUBLIC_ADS_ENV === 'off';

// 本番ビルドを開発者の実機で動かすときの保険。
// プロファイル判定(上)は production ビルドまでは守れないため、
// 実機で製品版を確認する場合はこちらに端末を登録してテスト広告に落とす。
// 端末IDは起動時のログに
// 「Use RequestConfiguration.Builder.setTestDeviceIds(Arrays.asList("33BE2250..."))」
// として出るので、それをカンマ区切りで EXPO_PUBLIC_ADS_TEST_DEVICE_IDS に並べる。
// 'EMULATOR' はエミュレータ全体を指す予約語(SDKが自動登録する挙動を明示しておく)。
//
// Expoのbabelプラグインは process.env.EXPO_PUBLIC_* という直接参照だけを
// ビルド時に値へ置換する。変数に束ねると置換されないのでこの形を崩さないこと
const configuredTestDeviceIds = String(process.env.EXPO_PUBLIC_ADS_TEST_DEVICE_IDS ?? '');
const TEST_DEVICE_IDS = [
  'EMULATOR',
  ...configuredTestDeviceIds
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id !== ''),
];

let initialized = false;

// AdMobの2026年要件に沿った初期化:
// 1. UMP(Google認定CMP)で同意取得 — EEA/UK配信時のGDPR要件。
//    フォームの内容はAdMob管理画面の「プライバシーとメッセージ」で公開しておく必要がある
// 2. iOSはATT許可プロンプト(UMP同意の後に表示するのがGoogle推奨順序)
// 3. リクエスト設定を申告してからSDK初期化。同意が得られない場合も
//    UMPの設定に従い非パーソナライズ広告で継続
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
    // 扱うコンテンツ(2ch/5chまとめ・ユーザーコメント)の実態に合わせて申告する。
    // 未申告だとGoogleの自動分類任せになり、ストアの年齢区分とも食い違う。
    // Tはストア申告(App Store 16+)と整合する上限
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.T,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      // 登録した端末では本番ユニットでもテスト広告が返る(収益に計上されない)
      testDeviceIdentifiers: TEST_DEVICE_IDS,
    });
  } catch {
    // 設定失敗時はSDK既定のまま初期化を続ける
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
