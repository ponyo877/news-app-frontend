// 記事本文を取得・整形できなかった理由。
//
// 【AdMobポリシー対応】どの理由でも結果は「本文の無い画面」になる。
// 旧実装は削除済み記事に案内文HTML(NOT_FOUND_HTML)を、整形できない記事に
// 取得元の生HTMLを、どちらも「成功」として返していたため、
// ArticleScreenの通常レンダリング=バナー広告つきの画面に落ちていた。
// これは「サイトの動作: ナビゲーション」の
// *存在しないコンテンツにリンクしている* に該当する。
// 例外にすることで、広告を描画しないエラー分岐へ構造的に落とす。
export type ArticleUnavailableReason =
  // 元記事が非200(削除・移転)
  | 'gone'
  // 対応エンジンがなく整形できない(サイト改装など)
  | 'unsupported';

export class ArticleUnavailableError extends Error {
  readonly reason: ArticleUnavailableReason;

  constructor(reason: ArticleUnavailableReason) {
    super(`article unavailable: ${reason}`);
    this.name = 'ArticleUnavailableError';
    this.reason = reason;
    // Babelがクラスをトランスパイルする環境でもinstanceofを効かせる
    Object.setPrototypeOf(this, ArticleUnavailableError.prototype);
  }
}

// 表示・リトライの分岐用。通常の通信エラーならundefinedを返す
export function articleUnavailableReason(error: unknown): ArticleUnavailableReason | undefined {
  return error instanceof ArticleUnavailableError ? error.reason : undefined;
}
