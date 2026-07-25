import { articleListSchema, articlePageSchema, commentListSchema } from '@/api/schemas';

const sampleArticle = {
  id: 'a1',
  titles: 'タイトル',
  url: 'http://blog.livedoor.jp/example/archives/1.html',
  image: 'https://matome.folks-chat.com/static/myimage_3.png',
  sitetitle: '暇人速報',
  siteID: 's1',
  publishedAt: '2023-09-09T12:34:56Z',
};

describe('articlePageSchema', () => {
  it('通常のレスポンスをパースできる', () => {
    const page = articlePageSchema.parse({
      data: [sampleArticle],
      lastPublishedAt: '2023-09-09T12:34:56Z',
    });
    expect(page.data).toHaveLength(1);
    expect(page.data[0]?.id).toBe('a1');
    expect(page.lastPublishedAt).toBe('2023-09-09T12:34:56Z');
  });

  it('data: null と lastPublishedAt 欠落を空に正規化する', () => {
    const page = articlePageSchema.parse({ data: null });
    expect(page.data).toEqual([]);
    expect(page.lastPublishedAt).toBe('');
  });

  it('数値idを文字列へ変換する(MySQL移行由来の揺れ対策)', () => {
    const page = articlePageSchema.parse({
      data: [{ ...sampleArticle, id: 123, siteID: 45 }],
    });
    expect(page.data[0]?.id).toBe('123');
    expect(page.data[0]?.siteID).toBe('45');
  });

  it('publishedAt null を空文字へ正規化する', () => {
    const page = articlePageSchema.parse({
      data: [{ ...sampleArticle, publishedAt: null }],
    });
    expect(page.data[0]?.publishedAt).toBe('');
  });
});

describe('articleListSchema', () => {
  it('similarの配列内null要素を除去する', () => {
    const list = articleListSchema.parse({ data: [sampleArticle, null, sampleArticle] });
    expect(list.data).toHaveLength(2);
  });
});

describe('commentListSchema', () => {
  it('コメント0件(data: null)を空配列にする', () => {
    expect(commentListSchema.parse({ data: null }).data).toEqual([]);
  });

  it('コメントをパースできる', () => {
    const parsed = commentListSchema.parse({
      data: [
        {
          id: 'c1',
          name: 'まとめくん',
          image_url: 'assets/images/icon/myimage_2.png',
          device_hash: 'abcdef0123456789',
          message: 'テスト',
          updated_at: '2023-09-09T12:34:56Z',
          created_at: '2023-09-09T12:34:56Z',
        },
      ],
    });
    expect(parsed.data[0]?.device_hash).toBe('abcdef0123456789');
  });
});
