import { parseArticleLink } from '@/lib/deepLinks';

const UUID = '4f70cea4-52bc-44d0-8ec9-eec41b526594';

describe('parseArticleLink', () => {
  it('Universal Links(https)から記事IDを取り出す', () => {
    expect(parseArticleLink(`https://matome.folks-chat.com/a/${UUID}`)).toBe(UUID);
  });

  it('カスタムスキーム(matomekun://)から記事IDを取り出す', () => {
    expect(parseArticleLink(`matomekun://a/${UUID}`)).toBe(UUID);
  });

  it('クエリ・フラグメント付きURLも受ける', () => {
    expect(parseArticleLink(`https://matome.folks-chat.com/a/${UUID}?utm_source=share`)).toBe(UUID);
  });

  it('大文字UUIDは小文字に正規化される', () => {
    expect(parseArticleLink(`matomekun://a/${UUID.toUpperCase()}`)).toBe(UUID);
  });

  it('対象外のURLはnull', () => {
    expect(parseArticleLink(null)).toBeNull();
    expect(parseArticleLink('https://example.com/a/' + UUID)).toBeNull();
    expect(parseArticleLink('https://matome.folks-chat.com/v1/article')).toBeNull();
    expect(parseArticleLink('https://matome.folks-chat.com/a/not-a-uuid')).toBeNull();
    expect(parseArticleLink(`exp+matome-kun://a/${UUID}`)).toBeNull();
  });
});
