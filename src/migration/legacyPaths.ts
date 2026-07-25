import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// 旧版path_provider getApplicationDocumentsDirectory()の実体:
// iOS: Documents直下(= expo-file-systemのdocumentDirectoryと同じ)
// Android: データディレクトリ配下の app_flutter/ サブディレクトリ
export function legacyDocumentsDir(): string | null {
  const documents = FileSystem.documentDirectory;
  if (!documents) {
    return null;
  }
  if (Platform.OS === 'android') {
    // '.../files/' → '.../app_flutter/'
    return documents.replace(/files\/$/, 'app_flutter/');
  }
  return documents;
}
