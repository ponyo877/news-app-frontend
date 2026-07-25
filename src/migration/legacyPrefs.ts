import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Settings } from 'react-native';

export interface LegacyPrefs {
  devicehash: string | null;
  name: string | null;
  iconPath: string | null;
}

// Flutter shared_preferencesの実体を追加ネイティブ依存なしで直接読む。
// iOS: 標準NSUserDefaults(RN標準のSettingsモジュールで読める)
// Android: shared_prefs/FlutterSharedPreferences.xml をファイルとして読んでパース
// いずれもキーには `flutter.` プレフィックスが付く
export async function readLegacyPrefs(): Promise<LegacyPrefs> {
  const prefs = Platform.OS === 'ios' ? readIosPrefs() : await readAndroidPrefs();
  return {
    devicehash: prefs['flutter.devicehash'] ?? null,
    name: prefs['flutter.Name'] ?? null,
    iconPath: prefs['flutter.Icon'] ?? null,
  };
}

function readIosPrefs(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of ['flutter.devicehash', 'flutter.Name', 'flutter.Icon']) {
    const value: unknown = Settings.get(key);
    if (typeof value === 'string' && value !== '') {
      result[key] = value;
    }
  }
  return result;
}

async function readAndroidPrefs(): Promise<Record<string, string>> {
  const documents = FileSystem.documentDirectory;
  if (!documents) {
    return {};
  }
  // '.../files/' → '.../shared_prefs/FlutterSharedPreferences.xml'
  const uri = documents.replace(/files\/$/, 'shared_prefs/FlutterSharedPreferences.xml');
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    return {};
  }
  return parseFlutterPrefsXml(await FileSystem.readAsStringAsync(uri));
}

// <string name="flutter.Name">値</string> 形式のエントリを抽出する
export function parseFlutterPrefsXml(xml: string): Record<string, string> {
  const result: Record<string, string> = {};
  const pattern = /<string name="([^"]+)">([\s\S]*?)<\/string>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) !== null) {
    const [, key, rawValue] = match;
    if (key && rawValue !== undefined && rawValue !== '') {
      result[key] = decodeXmlEntities(rawValue);
    }
  }
  return result;
}

function decodeXmlEntities(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}
