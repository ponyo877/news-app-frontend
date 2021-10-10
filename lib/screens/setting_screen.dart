import 'package:flutter/material.dart';
import 'webview.dart';
import 'select_sites.dart';
import 'user_conf_screen.dart';

class SettingInfo {
  IconData icon;
  String title;
  Widget widget;
  SettingInfo(this.icon, this.title, this.widget);
}

class SettingScreen extends StatelessWidget {
  SettingScreen._internal();
  String _contactURL;
  String _eulaURL;
  String _PPURL;
  String _reportURL;
  List<SettingInfo> _settingTabs;

  factory SettingScreen() {
    SettingScreen _settingScreen = SettingScreen._internal();
    _settingScreen._contactURL =
        "https://docs.google.com/forms/d/e/1FAIpQLSd-fuupDifDoJQ1uTkdyUCgzEiNvfUzdJe0YOhPfdSC3U2Erw/viewform?usp=sf_link";
    _settingScreen._PPURL = "http://gitouhon-juku-k8s2.ga/privacy_policy/";
    _settingScreen._eulaURL = "http://gitouhon-juku-k8s2.ga/eula/";
    _settingScreen._reportURL =
        "https://docs.google.com/forms/d/e/1FAIpQLSfKg5WOizYtdmAUdTUGvGoOTxHeARTzyiomS6fSiV8f6DfFVQ/viewform?usp=sf_link";

    _settingScreen._settingTabs = [
      SettingInfo(Icons.select_all, 'Select Site', SelectSites()),
      SettingInfo(
          Icons.privacy_tip_outlined,
          'Privacy Policy',
          NormalWebView(
            title: "Privacy Policy",
            selectedUrl: _settingScreen._PPURL,
          )),
      SettingInfo(
          Icons.privacy_tip_outlined,
          'EULA',
          NormalWebView(
            title: "EULA",
            selectedUrl: _settingScreen._eulaURL,
          )),
      SettingInfo(
          Icons.email_outlined,
          'Contact Us',
          NormalWebView(
            title: "Contact Us",
            selectedUrl: _settingScreen._contactURL,
          )),
      SettingInfo(
          Icons.email_outlined,
          'Help & Feedback',
          NormalWebView(
            title: "Help & Feedback",
            selectedUrl: _settingScreen._reportURL,
          )),
      SettingInfo(Icons.arrow_circle_up, 'App Version: 1.35', null),
    ];
    return _settingScreen;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column (
      children: [
        UserConfScreen(),
        SizedBox(height: 30),
        Expanded(
        child: Container(
          //height: 250,
        decoration: BoxDecoration(
          color: Colors.white10,
          borderRadius: BorderRadius.circular(16.0),
        ),
      child: ListView.separated(
        shrinkWrap: true,
        //physics: NeverScrollableScrollPhysics(),
        itemCount: _settingTabs.length,
        separatorBuilder: (BuildContext context, int index) =>
            Divider(color: Colors.white),
        itemBuilder: (BuildContext context, int index) {
          var isAppVer = _settingTabs[index].title.contains('App Version');
          return ListTile(
            leading: Icon(_settingTabs[index].icon),
            title: Text(
              _settingTabs[index].title,
              style: TextStyle(fontSize: 20),
            ),
            trailing: isAppVer ? null : Icon(Icons.keyboard_arrow_right),
            onTap: isAppVer
                ? null
                : () async {
                    await Navigator.of(context).push(MaterialPageRoute(
                        builder: (context) => _settingTabs[index].widget));
                  },
          );
        },
      ),
      ),)],
      ),
    );
  }
}
