import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';

class AdMobService {
  String? getBannerAdUnitId() {
    if (kReleaseMode) {
      if (Platform.isAndroid) {
        return 'ca-app-pub-6803082941924637/9130223639';
      } else if (Platform.isIOS) {
        return 'ca-app-pub-6803082941924637/7700310633';
      }
    } else {
      if (Platform.isAndroid) {
        return 'ca-app-pub-3940256099942544/6300978111';
      } else if (Platform.isIOS) {
        return 'ca-app-pub-3940256099942544/2934735716';
      }
    }
  }

  double getHeight(BuildContext context) {
    // final height = MediaQuery.of(context).size.height;
    // final percent = (height * 0.06).toDouble();
    return 50;
  }
}
