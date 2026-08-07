// 旧版はiOSでSafari 13のUAを固定使用していた(モバイル版ページの取得が目的)。
// RN版は決定性のため両OSで同じUAを使う。
const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';

export interface FetchHtmlResult {
  ok: boolean;
  status: number;
  html: string;
}

// まとめサイト側が落ちている・極端に遅いときに記事画面が無限スピナーになるのを防ぐ
const FETCH_TIMEOUT_MS = 8000;

// fetch().text()はUTF-8デコード(不正バイトはU+FFFD置換)。
// 旧版のUtf8Decoder(allowMalformed: true)と同挙動。charset変換は旧版でも未使用(デッドコード)
// タイムアウト時はAbortErrorでrejectされ、呼び出し側(useArticleHtml)のエラー表示に落ちる
export async function fetchHtml(url: string): Promise<FetchHtmlResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': IOS_SAFARI_UA },
      signal: controller.signal,
    });
    const html = res.ok ? await res.text() : '';
    return { ok: res.ok, status: res.status, html };
  } finally {
    clearTimeout(timer);
  }
}
