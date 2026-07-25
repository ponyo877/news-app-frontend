import { Asset } from 'expo-asset';

import { postUser } from '@/api/endpoints';
import { avatarSources } from '@/lib/avatars';
import { computeDeviceHash } from '@/lib/deviceHash';
import { runLegacyMigrationIfNeeded } from '@/migration';
import { refreshRemoteRules } from '@/scraper/rulesStore';
import { DEFAULT_AVATAR_ID, DEFAULT_USER_NAME, useUserStore } from '@/stores/userStore';

export interface BootstrapResult {
  // trueなら初回起動:「ユーザ名とアイコンが設定できます」ダイアログを表示する(旧版と同挙動)
  isFirstLaunch: boolean;
}

// 起動時に一度だけ実行: レガシー移行 → devicehash確保 → 新規ならサーバー登録
export async function bootstrapUser(): Promise<BootstrapResult> {
  // スクレイパールールのリモート更新(fire-and-forget、失敗しても同梱版で動く)
  void refreshRemoteRules();
  await runLegacyMigrationIfNeeded();

  const store = useUserStore.getState();
  if (store.devicehash) {
    return { isFirstLaunch: false };
  }

  const devicehash = await computeDeviceHash();
  store.setDevicehash(devicehash);
  await registerInitialUser(devicehash);
  return { isFirstLaunch: true };
}

// 旧版と同じく初回のみ name + avatar(myimage_1) をmultipartで登録。失敗しても起動は継続
async function registerInitialUser(devicehash: string): Promise<void> {
  try {
    const asset = Asset.fromModule(avatarSources[DEFAULT_AVATAR_ID] as number);
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    await postUser({
      devicehash,
      name: DEFAULT_USER_NAME,
      avatar: { uri, fileName: `myimage_${DEFAULT_AVATAR_ID}.png`, mimeType: 'image/png' },
    });
  } catch {
    // 登録失敗は致命的ではない(次回のプロフィール更新で再送される)
  }
}
