// 通報用Googleフォーム(旧版と同一のフォーム・プリフィルentry)
const ARTICLE_REPORT_FORM =
  'https://docs.google.com/forms/d/e/1FAIpQLSdbHG9M2IVrL1YTXg6pL1pk1GaDeUhm3_105Epp1UCjWO525w/viewform?usp=pp_url&entry.126191999=';

export function articleReportUrl(titles: string, url: string): string {
  return `${ARTICLE_REPORT_FORM}title%EF%BC%9A${encodeURIComponent(titles)}%0AURL%EF%BC%9A${encodeURIComponent(url)}`;
}
