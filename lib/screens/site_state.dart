import 'dart:async';
import 'package:http/http.dart' as http;
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'dart:convert';
import 'package:hive/hive.dart';
import 'models/history_model.dart';
import 'package:state_notifier/state_notifier.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final selectSiteProvider = StateNotifierProvider((ref) => SiteState("select"));

class SiteState extends StateNotifier<List> {
  // NewsState() : super([]);
  SiteState(String type) : super([]) {
    this._getInitSiteList();
  }

  String baseURL = "https://matome-kun.ga";
  Map<String, dynamic> data;
  List newsList = [];

  //file
  File _filePath;
  static const String kFileName = 'mySkipIDs.csv';
  bool _fileExists = false;

  Future<bool> _getInitSiteList() async {
    var getSiteList = baseURL + "/v1/user";
    http.Response response = await http.get(getSiteList);
    data = json.decode(response.body);

    newsList = data["data"];

    //read File
    _filePath = await _localFile;
    _fileExists = await _filePath.exists();

    if (!_fileExists) {
      for (int i = 0; i < newsList.length; i++) {
        newsList[i]["switchValue"] = true;
      }
    } else {
      var _fileData = await _filePath.readAsString();
      for (int i = 0; i < newsList.length; i++) {
        var siteID = _fileData.split(",");
        var flgSite = true;
        for (int j = 0; j < siteID.length; j++) {
          if (newsList[i]["siteID"].toString() == siteID[j].toString() ) {
            flgSite = false;
          }
        }
        newsList[i]["switchValue"] = flgSite;
      }
    }
    state = newsList;
    return true;
  }

  void changeSiteList(int site, bool flg) {
    for (int index=0; index < newsList.length; index++) {
      if (newsList[index]["siteID"] == site) {
        newsList[index]["switchValue"] = flg;
      }
    }
    state = newsList;
  }

  void writeJson() async {
    _filePath = await _localFile;
    _fileExists = await _filePath.exists();

    String _newData = '';
    newsList = state;
    for (int i = 0; i < newsList.length; i++) {
      if (newsList[i]["switchValue"] == false) {
        _newData = '$_newData${newsList[i]["siteID"]},';
      }
    }

    if (!_fileExists) {
      _filePath.writeAsString('');
    }
    _filePath.writeAsString(_newData);
  }

  Future<String> get _localPath async {
    final directory = await getApplicationDocumentsDirectory();
    return directory.path;
  }

  Future<File> get _localFile async {
    final path = await _localPath;
    return File('$path/$kFileName');
  }
}