import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:device_info/device_info.dart';
import 'dart:io';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:path_provider/path_provider.dart';
import 'package:http_parser/http_parser.dart';
import 'package:dio/dio.dart';

class SelectMyimageScreen extends StatefulWidget {
  final String icon;

  //const SelectMyimageScreen({Key? key, this.icon}) : super(key: key);
  SelectMyimageScreen(this.icon);

  @override
  _SelectMyimageScreen createState() => _SelectMyimageScreen();
}

class _SelectMyimageScreen extends State<SelectMyimageScreen> {
  int _selected = 0;
  String baseURL = "https://matome.folks-chat.com";

  @override
  void initState() {
    super.initState();
    _selected = int.parse(widget.icon.split(".")[0].split("_")[1]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('画像の選択'),
      ),
      body: GridView.count(
        crossAxisCount: 3, // 1行に表示する数
        crossAxisSpacing: 4.0, // 縦スペース
        mainAxisSpacing: 4.0, // 横スペース
        shrinkWrap: true,
        children: List.generate(22, (index) {
          return GestureDetector(
            onTap: () {
              setState(() {
                _selected = index + 1;
              });
            },
            child: Stack(
              children: <Widget>[
                Container(
                    //padding: const EdgeInsets.all(8.0),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: _selected == index + 1
                          ? Colors.white24
                          : Colors.white10,
                    ),
                    child: GridTile(
                      child: Image.asset(
                          'assets/images/icon/myimage_${index + 1}.png'),
                    )),
                Checkbox(
                  activeColor: Color(0xFFEF476F),
                  onChanged: (bool? se) {
                    setState(() {
                      _selected = index + 1;
                    });
                  },
                  value: _selected == index + 1 ? true : false,
                ),
              ],
            ),
          );
        }),
      ),
      bottomNavigationBar: BottomAppBar(
        shape: const CircularNotchedRectangle(),
        color: Theme.of(context).primaryColor,
        child: Row(
          children: <Widget>[
            GestureDetector(
              onTap: () {
                Navigator.of(context).pop();
              },
              child: Container(
                //color: Colors.white12,
                height: 50.0,
                width: MediaQuery.of(context).size.width / 2,
                child: Center(
                  child: Text("キャンセル"),
                ),
              ),
            ),
            GestureDetector(
              onTap: _selected == 0
                  ? null
                  : () {
                      var imageFilePath = "assets/images/icon/myimage_" +
                          _selected.toString() +
                          ".png";
                      getFileFromAssets(imageFilePath);
                      Navigator.of(context).pop('assets/images/icon/myimage_' +
                          _selected.toString() +
                          '.png');
                    },
              child: Container(
                color: _selected == 0 ? Colors.grey : Color(0xFFEF476F),
                height: 50.0,
                width: MediaQuery.of(context).size.width / 2,
                child: Center(
                  child: Text("選択"),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void setIcon(File icon) async {
    var requestURL = baseURL + "/v1/user";
    var map = new Map<String, dynamic>();

    final SharedPreferences prefs = await SharedPreferences.getInstance();
    var myStringData = await prefs.getString("devicehash");

    if (myStringData == null) {
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
      myStringData = digest;
      await prefs.setString("devicehash", digest);
    }
    final dio = Dio();
    final formData = FormData.fromMap({
      'devicehash': myStringData,
      'avatar': await MultipartFile.fromFile(
        icon.path,
        filename: icon.path.split('/').last,
        contentType: MediaType.parse('multipart/form-data'),
      ),
    });

    final response = await dio.post(requestURL, data: formData);
    print(response.statusCode);
  }

  Future getFileFromAssets(String path) async {
    var byteData = await rootBundle.load(path);
    var loc = await _localPath;
    var file = File('$loc/$path');
    print("loc/path: $loc/$path");
    await file.create(recursive: true);
    var imageFile = await file.writeAsBytes(byteData.buffer
        .asUint8List(byteData.offsetInBytes, byteData.lengthInBytes));
    setIcon(imageFile);
  }

  Future<String> get _localPath async {
    final directory = await getApplicationDocumentsDirectory();
    return directory.path;
  }
}
