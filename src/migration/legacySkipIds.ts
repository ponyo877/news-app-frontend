import * as FileSystem from 'expo-file-system/legacy';

import { legacyDocumentsDir } from '@/migration/legacyPaths';

export const LEGACY_SKIP_IDS_FILE = 'mySkipIDs.csv';

// 旧版のブロックサイトID(1行カンマ区切り)を読む。無ければ空配列
export async function readLegacySkipIds(): Promise<string[]> {
  const dir = legacyDocumentsDir();
  if (!dir) {
    return [];
  }
  const uri = `${dir}${LEGACY_SKIP_IDS_FILE}`;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      return [];
    }
    const content = await FileSystem.readAsStringAsync(uri);
    return parseSkipIdsCsv(content);
  } catch {
    return [];
  }
}

export function parseSkipIdsCsv(content: string): string[] {
  return content
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id !== '');
}
