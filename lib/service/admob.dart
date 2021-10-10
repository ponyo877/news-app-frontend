import 'dart:io';
import 'package:flutter/material.dart';

class AdMobService {
  String getBannerAdUnitId() {
    if (Platform.isAndroid) {
      return 'ca-app-pub-6803082941924637/9130223639';
    } else if (Platform.isIOS) {
      return 'ca-app-pub-6803082941924637/7700310633';
    }
    return null;
  }

  double getHeight(BuildContext context) {
    final height = MediaQuery.of(context).size.height;
    final percent = (height * 0.06).toDouble();
    return percent;
  }
}
