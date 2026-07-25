import { load, type CheerioAPI, type CheerioOptions } from 'cheerio/slim';

// 日本語をHTMLエンティティ化させない(WebView表示・デバッグ性のため)。
// xmlMode:false でHTMLセマンティクスを維持しつつhtmlparser2のシリアライズ設定を渡す
export const LOAD_OPTIONS: CheerioOptions = { xml: { encodeEntities: false, xmlMode: false } };

export function loadDoc(html: string): CheerioAPI {
  return load(html, LOAD_OPTIONS);
}
