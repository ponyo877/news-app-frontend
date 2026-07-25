// 通報用Googleフォーム(旧版と同一のフォーム・プリフィルentry)
const ARTICLE_REPORT_FORM =
  'https://docs.google.com/forms/d/e/1FAIpQLSdbHG9M2IVrL1YTXg6pL1pk1GaDeUhm3_105Epp1UCjWO525w/viewform?usp=pp_url&entry.126191999=';

export function articleReportUrl(titles: string, url: string): string {
  return `${ARTICLE_REPORT_FORM}title%EF%BC%9A${encodeURIComponent(titles)}%0AURL%EF%BC%9A${encodeURIComponent(url)}`;
}

export interface CommentReportParams {
  articleId: string;
  commentId: string;
  userName: string;
  message: string;
  reason: string;
}

// コメント通報。旧版のSlack Webhook直叩きは`as Uri`キャストで常にクラッシュしており
// 実質未動作だったため、記事通報と同じGoogleフォームのプリフィルに置き換える
export function commentReportUrl(params: CommentReportParams): string {
  const body =
    `コメント通報\n理由:${params.reason}\nuser:${params.userName}\n` +
    `message:${params.message}\narticleID:${params.articleId}\ncommentID:${params.commentId}`;
  return `${ARTICLE_REPORT_FORM}${encodeURIComponent(body)}`;
}
