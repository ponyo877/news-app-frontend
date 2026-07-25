import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

// 旧版(Flutter)と同一のdevicehashを再現する唯一の実装(旧版は4箇所に重複)。
// Android: ANDROID_ID / iOS: identifierForVendor を UTF-8 → SHA-1 → 小文字16進。
// 入力・出力形式が旧 device_info + crypto(Dart) と一致するため、
// 同一端末なら旧アプリと同じハッシュ=サーバー上の同一ユーザーになる。
export async function computeDeviceHash(): Promise<string> {
  const deviceId =
    Platform.OS === 'android'
      ? Application.getAndroidId()
      : await Application.getIosIdForVendorAsync();
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, deviceId ?? 'unknown-device');
}
