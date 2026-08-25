import { scrapeArticle } from '@/scraper';
import { ArticleUnavailableError, articleUnavailableReason } from '@/scraper/errors';
import { SOURCE_LINK_URL } from '@/scraper/serialize';
import { buildLivedoorHtml } from '@/scraper/__fixtures__/builders';

function mockFetchOnce(status: number, body: string) {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(body, { status }));
}

afterEach(() => jest.restoreAllMocks());

describe('scrapeArticle', () => {
  // 【AdMobポリシー対応】本文の無い画面を「成功」として返すと、
  // 呼び出し側が広告つきの通常レンダリングに落ちる(errors.ts参照)
  it('404は例外(gone)を投げる', async () => {
    mockFetchOnce(404, '');
    const promise = scrapeArticle('http://blog.example/gone', '暇人速報');
    await expect(promise).rejects.toBeInstanceOf(ArticleUnavailableError);
    await expect(promise.catch(articleUnavailableReason)).resolves.toBe('gone');
  });

  it('対応エンジンのない構造は例外(unsupported)を投げる', async () => {
    mockFetchOnce(200, '<html><head></head><body><p>plain</p></body></html>');
    const promise = scrapeArticle('http://other.example/', '暇人速報');
    await expect(promise).rejects.toBeInstanceOf(ArticleUnavailableError);
    await expect(promise.catch(articleUnavailableReason)).resolves.toBe('unsupported');
  });

  it('E2E: 整形+サイトルール+href剥奪まで通しで行う', async () => {
    const fixture = buildLivedoorHtml({
      bodyContent:
        '<p>本文</p><iframe src="http://himasoku.com/ueko2017.htm"></iframe>' +
        '<a href="http://x.example" target="_blank">外部リンク</a>',
    });
    mockFetchOnce(200, fixture);
    const html = await scrapeArticle('http://himasoku.com/archives/1.html', '暇人速報');
    expect(html).toContain('本文');
    expect(html).not.toContain('iframe');
    expect(html).not.toContain('sidebar junk');
    expect(html).not.toContain('href="http://x.example"');
    expect(html.startsWith('<head>')).toBe(true);
  });

  // 1.51はscript一律除去+href剥奪でXポスト・imgurが空白になっていた(本番670記事の23%)
  it('E2E: Xポスト・imgur・YouTubeの埋め込みが描画できる形で残る', async () => {
    const fixture = buildLivedoorHtml({
      bodyContent:
        '<blockquote class="twitter-tweet"><a href="https://twitter.com/a/status/1"></a></blockquote>' +
        '<script async src="https://platform.twitter.com/widgets.js"></script>' +
        '<blockquote class="imgur-embed-pub" data-id="abc"></blockquote>' +
        '<script async src="//s.imgur.com/min/embed.js"></script>' +
        '<iframe src="https://www.youtube.com/embed/abc"></iframe>' +
        '<script>var adstir_vars = {};</script><p>本文</p>',
    });
    mockFetchOnce(200, fixture);
    const html = await scrapeArticle('http://himasoku.com/archives/1.html', '暇人速報');
    expect(html).toContain('href="https://twitter.com/a/status/1"');
    expect(html).toContain('class="imgur-embed-pub"');
    expect(html).toContain('youtube.com/embed/abc');
    expect(html.match(/platform\.twitter\.com\/widgets\.js/g)).toHaveLength(1);
    expect(html.match(/s\.imgur\.com\/min\/embed\.js/g)).toHaveLength(1);
    expect(html).not.toContain('adstir_vars');
  });

  it('出典表示と元記事リンクを本文末尾に付ける', async () => {
    const fixture = buildLivedoorHtml({ bodyContent: '<p>本文</p>' });
    mockFetchOnce(200, fixture);
    const html = await scrapeArticle('http://himasoku.com/archives/1.html', '暇人速報');
    expect(html).toContain('class="app-source"');
    // 出典リンクだけは剥奪されず、WebView側で外部ブラウザへ渡される
    expect(html).toContain(`href="${SOURCE_LINK_URL}"`);
  });
});
