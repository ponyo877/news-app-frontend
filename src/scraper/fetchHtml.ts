// 旧版はiOSでSafari 13のUAを固定使用していた(モバイル版ページの取得が目的)。
// RN版は決定性のため両OSで同じUAを使う。
const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';

export interface FetchHtmlResult {
  ok: boolean;
  status: number;
  html: string;
}

// fetch().text()はUTF-8デコード(不正バイトはU+FFFD置換)。
// 旧版のUtf8Decoder(allowMalformed: true)と同挙動。charset変換は旧版でも未使用(デッドコード)
export async function fetchHtml(url: string): Promise<FetchHtmlResult> {
  const res = await fetch(url, { headers: { 'User-Agent': IOS_SAFARI_UA } });
  const html = res.ok ? await res.text() : '';
  return { ok: res.ok, status: res.status, html };
}
