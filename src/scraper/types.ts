// サイト別の広告・不要要素除去ルール。
// 完全にJSONシリアライズ可能なデータとして表現し(関数を含まない)、
// リモート配信(/v1/static/scraper-rules.json)でアプリ更新なしにルールを差し替えられる。
// 新しいサイトへの対応は defaultRules.json(またはリモートJSON)に1エントリ追加するだけでよい。

export interface AnchorCleanupRule {
  // 対象アンカーの絞り込みセレクタ
  selector: string;
  // 指定時: このプレフィックスで始まるhrefのアンカーを削除する
  hrefPrefix?: string;
  // 指定時: このプレフィックスで始まらないhrefのアンカーを削除する
  hrefNotPrefix?: string;
  // アンカー直後に削除する兄弟<br>の数
  trailingBr: number;
}

export interface SiteRule {
  // 表示・ログ用の識別名
  name: string;
  // 記事URLのマッチ条件(スキームを除いた前方一致)。
  // blog.livedoor.jp のように複数ブログが同居するホストはパスまで含めて区別する
  urlPrefixes: string[];
  // URLでマッチしなかった場合のフォールバック(旧版のsitetitle一致)
  siteTitles?: string[];
  removeSelectors?: string[];
  anchorCleanups?: AnchorCleanupRule[];
  // body末尾から削除する<br>の数(ワラノート固有)
  trimTrailingBrs?: number;
}

export interface ScraperRuleSet {
  // 同梱版とリモート版の新旧比較に使う(大きい方を採用)
  version: number;
  rules: SiteRule[];
}
