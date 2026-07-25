import { avatarIdFromLegacyPath } from '@/lib/avatars';
import { cleanupLegacyFiles } from '@/migration/cleanup';
import { readLegacyPrefs } from '@/migration/legacyPrefs';
import { readLegacySkipIds } from '@/migration/legacySkipIds';
import { storage } from '@/stores/mmkv';
import { useSiteFilterStore } from '@/stores/siteFilterStore';
import { useUserStore } from '@/stores/userStore';

export const MIGRATION_KEY = 'legacyMigration.v1.status';

export type MigrationStatus = 'done' | 'done-fresh' | 'failed';

// レガシー(Flutter版)データ移行。初回起動時に一度だけ実行される。
// 引き継ぐのは devicehash / Name / Icon / ブロックサイトのみ(Hiveの履歴・お気に入りは破棄)。
//
// devicehash が読めた場合、bootstrapUser() は /v1/user への再登録をスキップするため
// サーバー側ユーザーが重複・上書きされない(重要)。
// 読めなかった場合も bootstrapUser() が ANDROID_ID/IDFV から旧版と同一のハッシュを
// 再計算するため、サーバー上の同一ユーザーへ自然に再接続される。
export async function runLegacyMigrationIfNeeded(): Promise<void> {
  if (storage.getString(MIGRATION_KEY)) {
    return;
  }
  try {
    const prefs = await readLegacyPrefs();
    const skipIds = await readLegacySkipIds();

    if (skipIds.length > 0) {
      useSiteFilterStore.getState().setBlockedSiteIds(skipIds);
    }
    if (prefs.devicehash) {
      applyUserPrefs(prefs.devicehash, prefs.name, prefs.iconPath);
      storage.set(MIGRATION_KEY, 'done' satisfies MigrationStatus);
    } else {
      storage.set(MIGRATION_KEY, 'done-fresh' satisfies MigrationStatus);
    }
  } catch {
    // 失敗しても必ずフラグを書き、無限リトライしない(調査用にステータスを区別)
    storage.set(MIGRATION_KEY, 'failed' satisfies MigrationStatus);
  }
  void cleanupLegacyFiles();
}

function applyUserPrefs(devicehash: string, name: string | null, iconPath: string | null): void {
  const user = useUserStore.getState();
  user.setDevicehash(devicehash);
  if (name) {
    user.setName(name);
  }
  const avatarId = avatarIdFromLegacyPath(iconPath);
  if (avatarId !== null) {
    user.setAvatarId(avatarId);
  }
}
