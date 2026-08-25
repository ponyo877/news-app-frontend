import { isEmbedFrameUrl } from '@/scraper/embeds';
import { SOURCE_LINK_URL } from '@/scraper/serialize';

// WebViewの遷移要求のうち判定に使う部分。
// isTopFrame は iOS(WKWebView)だけが付ける(Androidは undefined)
export interface LoadRequest {
  url: string;
  isTopFrame?: boolean;
}

export type LoadDecision = 'allow' | 'deny' | 'open-source';

// WebView内の遷移可否。出典リンクだけは外部ブラウザへ逃がす。
// WebView内で開くと元サイトを広告ごと表示することになり、整形の意味も失われる。
// 本文中のhrefは剥奪済みだが、それ以外の遷移は保険として遮断する
export function decideLoadRequest(req: LoadRequest, articleUrl: string): LoadDecision {
  if (req.url === SOURCE_LINK_URL) {
    return 'open-source';
  }
  // iOSはiframe(サブフレーム)の読み込みでもここを通る。1.51までYouTube等の埋め込みが
  // 真っ白だったのはこの遮断が原因。埋め込みのホストだけ許可し、広告iframe等は引き続き遮断する。
  // Androidはサブフレームでは呼ばれず isTopFrame も無いので、この分岐には入らない
  if (req.isTopFrame === false) {
    return isEmbedFrameUrl(req.url) ? 'allow' : 'deny';
  }
  return req.url === articleUrl || req.url === 'about:blank' ? 'allow' : 'deny';
}
