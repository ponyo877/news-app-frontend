import { scrapeArticle } from '@/scraper';
import { NOT_FOUND_HTML } from '@/scraper/notFound';
import { buildLivedoorHtml } from '@/scraper/__fixtures__/builders';

function mockFetchOnce(status: number, body: string) {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(body, { status }));
}

afterEach(() => jest.restoreAllMocks());

describe('scrapeArticle', () => {
  it('404は削除済み記事HTMLを返す', async () => {
    mockFetchOnce(404, '');
    const html = await scrapeArticle('http://blog.example/gone', '暇人速報');
    expect(html).toBe(NOT_FOUND_HTML);
  });

  it('livedoor構造でないページは整形せずそのまま返す', async () => {
    mockFetchOnce(200, '<html><head></head><body><p>plain</p></body></html>');
    const html = await scrapeArticle('http://other.example/', '暇人速報');
    expect(html).toContain('plain');
  });

  it('E2E: 整形+サイトルール+href剥奪まで通しで行う', async () => {
    const fixture = buildLivedoorHtml({
      bodyContent:
        '<p>本文</p><iframe src="ad"></iframe>' +
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
});
