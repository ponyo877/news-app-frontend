import 'package:flutter/material.dart';
import 'post_screen.dart';
import 'ranking_post_screen.dart';
import 'search_post_screen.dart';
import 'history_post_screen.dart';
import 'setting_screen.dart';
import 'comment_screen.dart';
import 'user_conf_screen.dart';
import 'package:convex_bottom_bar/convex_bottom_bar.dart';
// TODO: Need to implement follow import
import 'package:shared_preferences/shared_preferences.dart';
import 'package:device_info/device_info.dart';
import 'dart:io';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;
import 'package:awesome_dialog/awesome_dialog.dart';

class TabInfo {
  IconData icon;
  String title;
  Widget widget;
  TabInfo(this.icon, this.title, this.widget);
}

class NewsListScreen extends StatelessWidget {
  //with TickerProviderStateMixin {
  //TabController _tabController;

  //final Map<String, dynamic> data;

  String initName = 'まとめくん';
  String initIcon = 'assets/images/icon/myimage_1.png';
  String baseURL = "https://matome-kun.ga";

  final List<TabInfo> _tabs = [
    TabInfo(Icons.format_list_numbered, 'Ranking', RankingPostScreen()),
    TabInfo(Icons.search, 'Search', SearchPostScreen()),
    TabInfo(Icons.home, 'Home', PostScreen()),
    TabInfo(Icons.person_pin , 'My Page', HistoryPostScreen()),
    TabInfo(Icons.settings, 'Setting', SettingScreen()),
    //TabInfo(Icons.bolt, 'Com', CommentScreen(user: currentUser)),
    //TabInfo(Icons.supervised_user_circle, 'User', UserConfScreen()),
  ];

  @override
  Widget build(BuildContext context) {
    getNameData();
    checkDeviceIdHash(context);
    return DefaultTabController(
      length: 5,
      initialIndex: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text("😁まとめくん😁"),
          centerTitle: true,
        ),
        bottomNavigationBar: SafeArea(
          child: ConvexAppBar(
            style: TabStyle.reactCircle,
            backgroundColor: Colors.blueGrey,
            color: Colors.white,
            //activeColor: Colors.blue,
            items: <TabItem>[
              for (final entry in _tabs)
                TabItem(icon: entry.icon, title: entry.title),
            ],
          ),
        ),
        body: SafeArea(
          child: TabBarView(
            children: _tabs.map((tab) => tab.widget).toList(),
          ),
        ),
        // TODO: Need to implement hidden AppBar
        // body: SafeArea(
        //   child: extended.NestedScrollView(
        //     headerSliverBuilder:
        //     (BuildContext context, bool innerBoxIsScrolled) {
        //       return <Widget>[
        //         SliverOverlapAbsorber(
        //           handle:
        //           extended.NestedScrollView.sliverOverlapAbsorberHandleFor(context),
        //           sliver: SliverAppBar(
        //             title: const Center(child: Text("😁まとめくん😁")),
        //             pinned: false,
        //             forceElevated: innerBoxIsScrolled,
        //           ),
        //         ),
        //       ];
        //     },
        //     body: TabBarView(
        //       children: _tabs.map((tab) => tab.widget).toList(),
        //     ),
        //   ),
        // ),
      ),
    );
  }

  initNameData() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString("Name", initName);
    await prefs.setString("Icon", initIcon);
  }

  getNameData() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    var myStringData = await prefs.getString("Name");
    //print("Name: " + myStringData);
    if (myStringData == null) {
      initNameData();
    }
  }

  Future checkDeviceIdHash(BuildContext context) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    var myStringData = await prefs.getString("devicehash");
    print("devicehash: ");
    // print(myStringData);

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
      await prefs.setString("devicehash", digest);

      //create popup
      AwesomeDialog(
        context: context,
        dialogType: DialogType.INFO_REVERSED,
        animType: AnimType.BOTTOMSLIDE,
        title: 'ユーザ名とアイコンが設定できます',
        desc: '設定画面からユーザ名とアイコンを設定してください。',
        //btnCancelOnPress: () {},
        btnOkOnPress: () {},
      )..show();

      //サーバ側にも初期値を送信
      var requestURL = baseURL + "/v1/user";
      var map = new Map<String, dynamic>();
      map["name"] = initName;
      map["devicehash"] = digest;
      map["avatar"] = initIcon;
      http.Response response = await http.post(requestURL, body: map);
      print(response.statusCode);
    }
  }
}