import { Platform } from 'react-native';
import DefaultPreference from 'react-native-default-preference';

export interface LegacyPrefs {
  devicehash: string | null;
  name: string | null;
  iconPath: string | null;
}

// Flutter shared_preferencesの実体を直接読む。
// Android: SharedPreferences XML `FlutterSharedPreferences`
// iOS: 標準NSUserDefaults
// いずれもキーには `flutter.` プレフィックスが付く
export async function readLegacyPrefs(): Promise<LegacyPrefs> {
  if (Platform.OS === 'android') {
    await DefaultPreference.setName('FlutterSharedPreferences');
  }
  const [devicehash, name, iconPath] = await Promise.all([
    readKey('flutter.devicehash'),
    readKey('flutter.Name'),
    readKey('flutter.Icon'),
  ]);
  return { devicehash, name, iconPath };
}

async function readKey(key: string): Promise<string | null> {
  const value = await DefaultPreference.get(key);
  return typeof value === 'string' && value !== '' ? value : null;
}
