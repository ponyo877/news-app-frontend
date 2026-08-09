import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { postDeviceToken } from '@/api/endpoints';
import { logError, logEvent } from '@/lib/analytics';
import { computeDeviceHash } from '@/lib/deviceHash';
import type { ArticleMeta } from '@/stores/articleStatusStore';

// プッシュ通知(Expo Push)の唯一の窓口。
// 通知はダイジェスト1日2回だけなので、フォアグラウンド受信時もバナー表示してよい

// 通知データ(backendのSendDailyDigestが積むメタ情報一式)をArticleMetaに復元する。
// 欠けがあればnull(通知起因の遷移はせず通常起動として振る舞う)
export function parseNotificationArticle(data: Record<string, unknown>): ArticleMeta | null {
  const { id, titles, url, image, siteID, sitetitle, publishedAt } = data;
  if (typeof id !== 'string' || typeof titles !== 'string' || typeof url !== 'string' || !url) {
    return null;
  }
  return {
    id,
    titles,
    url,
    image: typeof image === 'string' ? image : '',
    siteID: typeof siteID === 'string' ? siteID : '',
    sitetitle: typeof sitetitle === 'string' ? sitetitle : '',
    publishedAt: typeof publishedAt === 'string' ? publishedAt : '',
  };
}

// フォアグラウンド受信時の表示方法。App起動時に一度だけ呼ぶ
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
  });
}

// Android 8+は通知チャンネル必須(未作成だと通知自体が表示されない)
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync('default', {
    name: 'お知らせ',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// Expo Pushトークンを取得。シミュレータ・取得失敗はnull(呼び出し側は黙ってスキップ)
async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }
  try {
    const projectId = (
      Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
    )?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return token.data;
  } catch (error) {
    logError(error, 'getExpoPushToken');
    return null;
  }
}

// サーバへトークンを登録(許諾済みが前提)。失敗しても投げない(次回起動時に再送される)
export async function registerPushToken(
  digestEnabled: boolean,
  matsuriEnabled: boolean,
): Promise<boolean> {
  const expotoken = await getExpoPushToken();
  if (!expotoken) {
    return false;
  }
  try {
    const devicehash = await computeDeviceHash();
    return await postDeviceToken({
      expotoken,
      devicehash,
      platform: Platform.OS,
      digest: digestEnabled,
      matsuri: matsuriEnabled,
    });
  } catch (error) {
    logError(error, 'registerPushToken');
    return false;
  }
}

// OSの許諾プロンプトを表示し、許諾されたらトークン登録。
// プレ許諾ダイアログ(NotificationPromptDialog)の「受け取る」から呼ぶ
export async function requestPermissionAndRegister(
  digestEnabled: boolean,
  matsuriEnabled: boolean,
): Promise<boolean> {
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted && current.canAskAgain) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  logEvent('notification_permission', { granted: String(granted) });
  if (!granted) {
    return false;
  }
  return registerPushToken(digestEnabled, matsuriEnabled);
}

// 起動時同期: 許諾済み端末のみ、トークンローテーションに追随してサーバへ再登録する。
// 未許諾端末では何もしない(OSプロンプトはプレ許諾フロー以外から出さない)
export async function syncPushTokenIfGranted(
  digestEnabled: boolean,
  matsuriEnabled: boolean,
): Promise<void> {
  const current = await Notifications.getPermissionsAsync();
  if (!current.granted) {
    return;
  }
  await ensureAndroidChannel();
  await registerPushToken(digestEnabled, matsuriEnabled);
}
