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

  it('markReadは旧版同様に履歴の重複を許す', () => {
    useArticleStatusStore.getState().markRead(article);
    useArticleStatusStore.getState().markRead(article);
    expect(useArticleStatusStore.getState().history).toHaveLength(2);
  });

  it('toggleFavoriteで追加と削除がトグルする', () => {
    useArticleStatusStore.getState().toggleFavorite(article);
    expect(useArticleStatusStore.getState().favorites['a1']).toBeDefined();
    useArticleStatusStore.getState().toggleFavorite(article);
    expect(useArticleStatusStore.getState().favorites['a1']).toBeUndefined();
  });
});
