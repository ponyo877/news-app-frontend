import 'dart:io';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:device_info/device_info.dart';

Future<String> getDeviceIdHash() async {
  DeviceInfoPlugin deviceInfo = DeviceInfoPlugin();
  var deviceId;
  if (Platform.isAndroid) {
    AndroidDeviceInfo androidInfo = await deviceInfo.androidInfo;
    deviceId = androidInfo.androidId;
  } else if (Platform.isIOS) {
    IosDeviceInfo iosDeviceInfo = await deviceInfo.iosInfo;
    deviceId = iosDeviceInfo.identifierForVendor;
  }
  var bytes = utf8.encode(deviceId); // data being hashed
  var digest = sha1.convert(bytes).toString();
  return digest;
}