import { load } from 'cheerio/slim';

import { collectArticleBodies } from '@/scraper/engines/livedoor';
import { buildLivedoorHtml, pageBodyHtml } from '@/scraper/__fixtures__/builders';

describe('collectArticleBodies', () => {
  it('単一ページはそのまま', async () => {
    const $ = load(buildLivedoorHtml({ bodyContent: '<p>P1</p>' }));
    const fetchPage = jest.fn();
    await collectArticleBodies($, fetchPage);
    expect(fetchPage).not.toHaveBeenCalled();
    expect($('div.article-body-outer .article-body')).toHaveLength(1);
  });

  it('複数ページ(1/3)はp=2,3を取得して結合する', async () => {
    const $ = load(
      buildLivedoorHtml({
        bodyContent: '<p>P1</p>',
        pageCurrent: '1/3',
        nextHref: 'http://blog.example/archives/1.html?p=2',
      }),
    );
    const fetchPage = jest
      .fn<Promise<string>, [string]>()
      .mockImplementation((url) =>
        Promise.resolve(pageBodyHtml(url.includes('p=2') ? '<p>P2</p>' : '<p>P3</p>')),
      );
    await collectArticleBodies($, fetchPage);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    const text = $('div.article-body-outer').text();
    expect(text).toContain('P1');
    expect(text).toContain('P2');
    expect(text).toContain('P3');
  });

  it('追加ページの取得失敗はスキップして続行する', async () => {
    const $ = load(
      buildLivedoorHtml({
        bodyContent: '<p>P1</p>',
        pageCurrent: '1/3',
        nextHref: 'http://blog.example/archives/1.html?p=2',
      }),
    );
    const fetchPage = jest
      .fn<Promise<string>, [string]>()
      .mockImplementationOnce(() => Promise.reject(new Error('network')))
      .mockImplementationOnce(() => Promise.resolve(pageBodyHtml('<p>P3</p>')));
    await collectArticleBodies($, fetchPage);
    const text = $('div.article-body-outer').text();
    expect(text).toContain('P1');
    expect(text).toContain('P3');
  });
});
