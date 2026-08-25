import * as Application from 'expo-application';
import { Platform } from 'react-native';

import { getActiveRuleSet } from '@/scraper/rulesStore';

// 記事表示の不具合報告(記事画面⋮メニュー「表示の不具合を報告」)。
//
// 1.51で記事内の埋め込み(Xポスト・imgur・YouTube)が消えていた際、ユーザーから具体的な記事URLが
// 届かず、本番の記事を数百件取得して初めて実態が掴めた(docs/REMAINING_TASKS.md の訂正)。
// 理由を選ぶだけで記事URL・アプリ内ID・端末情報をサーバに蓄積し、管理者がSQLで閲覧して
// 対応状態を管理する(docs/ARTICLE-REPORTS.md)。自由記述は取らない(1タップで送れることを優先)

// key はバックエンド entity.ArticleReportReasons と一致させる(DBの reason 列に入る)
export const ARTICLE_REPORT_REASONS = [
  { key: 'missing_media', label: '画像・動画・Xのポストが出ない' },
  { key: 'ad_remains', label: '広告や関係ないリンクが残っている' },
  { key: 'body_broken', label: '本文が欠けている・崩れている' },
  { key: 'other', label: 'その他' },
] as const;

export type ArticleReportReason = (typeof ARTICLE_REPORT_REASONS)[number]['key'];

export interface ArticleReportContext {
  platform: string;
  // 開発ビルドでは取れないことがあるので空文字を許容(バックエンドも空を通す)
  appversion: string;
  // 報告時に有効だった scraper-rules の version(どのルールで整形した結果かを突き合わせる)
  rulesversion: number;
}

// 報告に添える端末情報。expo-application と scraper/rulesStore への依存をここに閉じ込め、
// テストではこの関数だけを差し替える
export function collectArticleReportContext(): ArticleReportContext {
  return {
    platform: Platform.OS,
    appversion: Application.nativeApplicationVersion ?? '',
    rulesversion: getActiveRuleSet().version,
  };
}
