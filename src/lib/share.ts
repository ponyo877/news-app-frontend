import { Platform, Share } from 'react-native';

import { logEvent } from '@/lib/analytics';
import type { ArticleMeta } from '@/stores/articleStatusStore';

// 共有着地ページ(OGP+アプリで開く+ストアバッジ)。backend /a/:id がSSRする
export const articleLandingUrl = (id: string) => `https://matome.folks-chat.com/a/${id}`;

export type ShareFrom = 'header' | 'list_sheet';

// シェアの唯一の窓口(shareイベントの発火箇所もここに一本化)。
// iOSはurlを別枠で渡すとAirDrop等がリンクとして扱う。Androidはurlを無視するためmessage一本
export async function shareArticle(article: ArticleMeta, from: ShareFrom): Promise<void> {
  const url = articleLandingUrl(article.id);
  const text = `${article.titles} - まとめくん`;
  logEvent('share', { site: article.sitetitle, from });
  await Share.share(
    Platform.OS === 'ios' ? { message: text, url } : { message: `${text}\n${url}` },
  );
}
