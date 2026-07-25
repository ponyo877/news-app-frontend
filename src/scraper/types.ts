// サイト別の広告・不要要素除去ルールの宣言的表現。
// 新しいサイトへの対応は siteRules.ts に1エントリ追加するだけでよい。
export interface AnchorCleanup {
  // 対象アンカーの絞り込みセレクタ
  selector: string;
  // trueを返したhrefのアンカーを削除する
  hrefTest: (href: string) => boolean;
  // アンカー直後に削除する兄弟<br>の数
  trailingBr: number;
}

export interface SiteRule {
  removeSelectors?: readonly string[];
  anchorCleanups?: readonly AnchorCleanup[];
  // body末尾から削除する<br>の数(ワラノート固有)
  trimTrailingBrs?: number;
}
