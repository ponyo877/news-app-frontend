import { ArticleMeta, useArticleStatusStore } from '@/stores/articleStatusStore';

const article: ArticleMeta = {
  id: 'a1',
  titles: 'タイトル',
  url: 'http://example.com/1',
  image: 'http://example.com/1.png',
  siteID: 's1',
  sitetitle: '暇人速報',
  publishedAt: '2023-09-09T12:34:56Z',
};

beforeEach(() => {
  useArticleStatusStore.setState({ readIds: {}, favorites: {}, history: [] });
});

describe('articleStatusStore', () => {
  it('markReadで既読と履歴が同時に付く', () => {
    useArticleStatusStore.getState().markRead(article);
    const s = useArticleStatusStore.getState();
    expect(s.readIds['a1']).toBe(true);
    expect(s.history).toHaveLength(1);
    expect(s.history[0]?.id).toBe('a1');
  });

  it('markReadは同一記事を重複させず最新閲覧として末尾に置く', () => {
    const other: ArticleMeta = { ...article, id: 'a2', titles: '別の記事' };
    useArticleStatusStore.getState().markRead(article);
    useArticleStatusStore.getState().markRead(other);
    useArticleStatusStore.getState().markRead(article);
    const history = useArticleStatusStore.getState().history;
    expect(history).toHaveLength(2);
    // 再閲覧した記事が末尾(=履歴表示の先頭)に来る
    expect(history[1]?.id).toBe('a1');
    expect(history[0]?.id).toBe('a2');
  });

  it('markReadは履歴を上限500件に丸める', () => {
    for (let i = 0; i < 510; i++) {
      useArticleStatusStore.getState().markRead({ ...article, id: `id-${i}` });
    }
    const history = useArticleStatusStore.getState().history;
    expect(history).toHaveLength(500);
    // 古い方から削られる(最古のid-0〜id-9が消え、最新のid-509が残る)
    expect(history[0]?.id).toBe('id-10');
    expect(history[499]?.id).toBe('id-509');
  });

  it('toggleFavoriteで追加と削除がトグルする', () => {
    useArticleStatusStore.getState().toggleFavorite(article);
    expect(useArticleStatusStore.getState().favorites['a1']).toBeDefined();
    useArticleStatusStore.getState().toggleFavorite(article);
    expect(useArticleStatusStore.getState().favorites['a1']).toBeUndefined();
  });
});
