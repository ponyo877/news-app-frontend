import * as FileSystem from 'expo-file-system/legacy';

import { legacyDocumentsDir } from '@/migration/legacyPaths';
import { LEGACY_SKIP_IDS_FILE } from '@/migration/legacySkipIds';

// 移行対象外のHive残骸(履歴・お気に入り)と移行済みCSVを削除する。
// 失敗しても実害はないためすべて握り潰す
const LEGACY_FILES = [
  'history.hive',
  'history.lock',
  'favorite.hive',
  'favorite.lock',
  LEGACY_SKIP_IDS_FILE,
];

export async function cleanupLegacyFiles(): Promise<void> {
  const dir = legacyDocumentsDir();
  if (!dir) {
    return;
  }
  await Promise.all(
    LEGACY_FILES.map((file) =>
      FileSystem.deleteAsync(`${dir}${file}`, { idempotent: true }).catch(() => undefined),
    ),
  );
}
