import { parseNotificationArticle } from '@/lib/notifications';

jest.mock('expo-constants', () => ({ expoConfig: null }));
jest.mock('expo-device', () => ({ isDevice: false }));
jest.mock('expo-notifications', () => ({}));
jest.mock('@/lib/deviceHash', () => ({ computeDeviceHash: jest.fn() }));

const fullData = {
  type: 'digest',
  id: '0188aaaa-bbbb-cccc-dddd-eeeeffff0000',
  titles: '今日の1位記事',
  url: 'https://example.com/article',
  image: 'https://example.com/image.jpg',
  siteID: '0188aaaa-bbbb-cccc-dddd-eeeeffff1111',
  sitetitle: 'テストサイト',
  publishedAt: '2026-08-08T12:00:00+09:00',
};

describe('parseNotificationArticle', () => {
  it('backendのダイジェスト通知データをArticleMetaへ復元する', () => {
    expect(parseNotificationArticle(fullData)).toEqual({
      id: fullData.id,
      titles: fullData.titles,
      url: fullData.url,
      image: fullData.image,
      siteID: fullData.siteID,
      sitetitle: fullData.sitetitle,
      publishedAt: fullData.publishedAt,
    });
  });

  it('必須フィールド(id/titles/url)が欠けたらnull', () => {
    expect(parseNotificationArticle({})).toBeNull();
    expect(parseNotificationArticle({ ...fullData, id: undefined })).toBeNull();
    expect(parseNotificationArticle({ ...fullData, titles: 123 })).toBeNull();
    expect(parseNotificationArticle({ ...fullData, url: '' })).toBeNull();
  });

  it('任意フィールドの欠けは空文字で補完する', () => {
    const { id, titles, url } = fullData;
    expect(parseNotificationArticle({ id, titles, url })).toEqual({
      id,
      titles,
      url,
      image: '',
      siteID: '',
      sitetitle: '',
      publishedAt: '',
    });
  });
});
