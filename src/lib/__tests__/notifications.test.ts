import { parseNotificationArticle, registerPushToken } from '@/lib/notifications';

const mockGetExpoPushTokenAsync = jest.fn<Promise<{ data: string }>, [unknown?]>();
const mockLogEvent = jest.fn<void, [string, Record<string, unknown>?]>();
const mockLogError = jest.fn<void, [unknown, string?]>();

jest.mock('expo-constants', () => ({ expoConfig: null }));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: (options?: unknown) => mockGetExpoPushTokenAsync(options),
}));
jest.mock('@/lib/deviceHash', () => ({ computeDeviceHash: jest.fn() }));
jest.mock('@/lib/analytics', () => ({
  logEvent: (name: string, params?: Record<string, unknown>) => mockLogEvent(name, params),
  logError: (error: unknown, context?: string) => mockLogError(error, context),
}));

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

// 端末要因(Googleアカウント未設定・通信断)の失敗は日常的に起きる。
// Crashlyticsのイシューにすると本物のクラッシュが埋もれるので、計測イベントに留める
describe('プッシュトークン取得の失敗', () => {
  beforeEach(() => {
    mockGetExpoPushTokenAsync.mockReset();
    mockLogEvent.mockReset();
    mockLogError.mockReset();
  });

  it('Crashlyticsではなく計測イベントとして記録する', async () => {
    mockGetExpoPushTokenAsync.mockRejectedValue(new Error('FCM Registration failed!'));

    await expect(registerPushToken(true, true)).resolves.toBe(false);

    expect(mockLogError).not.toHaveBeenCalled();
    expect(mockLogEvent).toHaveBeenCalledWith('push_token_failed', {
      step: 'fetch_token',
      reason: 'FCM Registration failed!',
    });
  });

  it('理由はGA4の上限100文字に切り詰める', async () => {
    mockGetExpoPushTokenAsync.mockRejectedValue(new Error('あ'.repeat(300)));

    await registerPushToken(true, true);

    const params = mockLogEvent.mock.calls[0]?.[1];
    expect(String(params?.reason)).toHaveLength(100);
  });
});
