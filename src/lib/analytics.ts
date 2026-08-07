// Firebase Analytics / Crashlytics の薄いラッパー。
//
// Firebase設定ファイル(google-services.json / GoogleService-Info.plist)が
// リポジトリ直下に無いビルドではネイティブモジュールが初期化されないため、
// その場合はすべて no-op に落として本体機能に影響させない(app.config.ts参照)。
// 計測は「あれば送る・なければ黙る」— 失敗がユーザー体験に漏れてはいけない。
//
// RNFirebase v26 はmodular APIのみ(名前空間APIは撤去済み)。
// イベント設計は docs/GROWTH-PLAN.md §2-1 の表が正。追加時はそちらも更新すること。

type AnalyticsModule = {
  getAnalytics: () => unknown;
  logEvent: (
    analytics: unknown,
    name: string,
    params?: Record<string, unknown>,
  ) => Promise<void>;
  logScreenView: (
    analytics: unknown,
    params: { screen_name: string; screen_class: string },
  ) => Promise<void>;
};

type CrashlyticsModule = {
  getCrashlytics: () => unknown;
  recordError: (crashlytics: unknown, error: Error, jsErrorName?: string) => void;
};

let analyticsRef: { module: AnalyticsModule; instance: unknown } | null | undefined;
let crashlyticsRef: { module: CrashlyticsModule; instance: unknown } | null | undefined;

function getAnalyticsRef() {
  if (analyticsRef === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const module = require('@react-native-firebase/analytics') as AnalyticsModule;
      analyticsRef = { module, instance: module.getAnalytics() };
    } catch {
      analyticsRef = null;
    }
  }
  return analyticsRef;
}

function getCrashlyticsRef() {
  if (crashlyticsRef === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const module = require('@react-native-firebase/crashlytics') as CrashlyticsModule;
      crashlyticsRef = { module, instance: module.getCrashlytics() };
    } catch {
      crashlyticsRef = null;
    }
  }
  return crashlyticsRef;
}

// カスタムイベント送信(fire-and-forget)
export function logEvent(name: string, params?: Record<string, unknown>): void {
  try {
    const ref = getAnalyticsRef();
    if (ref) {
      void ref.module.logEvent(ref.instance, name, params).catch(() => {});
    }
  } catch {
    // 計測の失敗でアプリを止めない
  }
}

// 画面遷移(GA4標準のscreen_view)
export function logScreenView(screenName: string): void {
  try {
    const ref = getAnalyticsRef();
    if (ref) {
      void ref.module
        .logScreenView(ref.instance, { screen_name: screenName, screen_class: screenName })
        .catch(() => {});
    }
  } catch {
    // 計測の失敗でアプリを止めない
  }
}

// 非致命エラーのCrashlytics送信(ErrorBoundary・重要catch節から呼ぶ)
export function logError(error: unknown, context?: string): void {
  try {
    const ref = getCrashlyticsRef();
    if (ref) {
      const err = error instanceof Error ? error : new Error(String(error));
      ref.module.recordError(ref.instance, err, context);
    }
  } catch {
    // 計測の失敗でアプリを止めない
  }
}
