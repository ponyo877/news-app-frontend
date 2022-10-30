import 'dart:async';
import 'package:http/http.dart' as http;
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'dart:convert';
import 'package:hive/hive.dart';
import 'models/history_model.dart';
import 'package:state_notifier/state_notifier.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:flutter/material.dart';

final newsProvider = StateNotifierProvider((ref) => NewsState("latest"));
final recommendedProvider =
    StateNotifierProvider((ref) => NewsState("recommended"));
final historyProvider = StateNotifierProvider((ref) => NewsState("history"));
final favoriteProvider = StateNotifierProvider((ref) => NewsState("favorite"));
final rankingMonthProvider =
    StateNotifierProvider((ref) => NewsState("month_ranking"));
final rankingWeekProvider =
    StateNotifierProvider((ref) => NewsState("week_ranking"));
final rankingDayProvider =
    StateNotifierProvider((ref) => NewsState("day_ranking"));
final searchResultProvider =
    StateNotifierProvider((ref) => NewsState("search"));

class NewsState extends StateNotifier<List> {
  // NewsState() : super([]);
  NewsState(String type) : super([]) {
    switch (type) {
      case "latest":
        this.getPost(true);
        print("初期化：latest");
        break;
      case "history":
        this.initHistory("history");
        break;
      case "favorite":
        this.initHistory("favorite");
        print("初期化：favorite");
        break;
      case "month_ranking":
        this.getRanking("monthly");
        break;
      case "week_ranking":
        this.getRanking("weekly");
        break;
      case "day_ranking":
        this.getRanking("daily");
        break;
      case "recommended":
        this.getRecommended();
        print("初期化：recommend");
        break;
      case "search":
        state = null;
        break;
    }
    // if (type == "latest") {
    //  this.getPost(true);
    // } else if (type == "history") {
    //   this.initHistory();
    // } else if (type == "ranking") {
    //   this.getRanking();
    // } else if (type == "recommended") {
    //   this.getRecommended();
    // }
  }

  static const String kFileName = 'mySkipIDs.csv';
  File _filePath;
  bool _fileExists = false;

  Map<String, dynamic> data;
  List newsPost = [];
  String lastpublished = "";
  String baseURL = "https://matome-kun.ga";

  Box historyBox;
  Box favoriteBox;

  Future _future;
  String searchWord;

  void getPost(bool initFlg) async {
    //print(initFlg);
    if (initFlg) {
      lastpublished = "";
      newsPost = [];
    }
    _filePath = await _localFile;
    _fileExists = await _filePath.exists();
    var _skipIDs = "";
    if (_fileExists) {
      _skipIDs = await _filePath.readAsString();
    }
    var getPostURL = baseURL +
        "/v1/article?lastPublishedAt=" +
        lastpublished +
        "&skipIDs=" +
        _skipIDs;
    print('getPostURL: ' + getPostURL);
    http.Response response = await http.get(getPostURL);
    data = json.decode(response.body);

    newsPost.addAll(data["data"]);
    lastpublished = data["lastPublishedAt"];

    //init readflg
    _initReadFlg();
  }

  void _initReadFlg() async {
    historyBox = await Hive.openBox<HistoryModel>('history');
    favoriteBox = await Hive.openBox<HistoryModel>('favorite');

    if (newsPost != null) {
      if (newsPost.length != 0) {
        for (var newsPostOne in newsPost) {
          // if (newsPostOne == null) {
          // print("aaaaaaaaaaaaa");
          // print(newsPost);
          // }
          if (newsPostOne["readFlg"] != true) {
            var check = historyBox.values.firstWhere(
                (list) => list.id == newsPostOne["id"],
                orElse: () => null);
            if (check == null) {
              newsPostOne["readFlg"] = false;
            } else {
              newsPostOne["readFlg"] = true;
            }
          }

          //init favorite Flg
          if (newsPostOne["favoriteFlg"] != true) {
            var check = favoriteBox.values.firstWhere(
                (list) => list.id == newsPostOne["id"],
                orElse: () => null);
            if (check == null) {
              newsPostOne["favoriteFlg"] = false;
            } else {
              newsPostOne["favoriteFlg"] = true;
              print("true" + ": " + newsPostOne["titles"]);
            }
          }
        }
      }
    }
    // print(favoriteBox.values.toList().last.id);
    state = [...newsPost];
    // print(newsPost[0]["favoriteFlg"]);
  }

  Future<String> get _localPath async {
    final directory = await getApplicationDocumentsDirectory();
    return directory.path;
  }

  Future<File> get _localFile async {
    final path = await _localPath;
    return File('$path/$kFileName');
  }

  void changeOneLatest(String id) {
    newsPost = state;
    if (newsPost != null) {
      if (newsPost.length != 0) {
        for (var newsPostOne in newsPost) {
          if (newsPostOne["id"] == id) {
            newsPostOne["readFlg"] = true;
            state = newsPost;
          }
        }
      }
    }
  }

  void changeOneFavorite(String id, bool onFlg) {
    newsPost = state;
    if (newsPost != null) {
      if (newsPost.length != 0) {
        for (var newsPostOne in newsPost) {
          if (newsPostOne["id"] == id) {
            if (onFlg) {
              newsPostOne["favoriteFlg"] = false;
            } else {
              newsPostOne["favoriteFlg"] = true;
            }
            //print(newsPostOne["titles"]);
            //print(newsPostOne["favoriteFlg"]);

            state = newsPost;
          }
        }
      }
    }
  }

  void initHistory(String type) async {
    //print("init History kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
    historyBox = await Hive.openBox<HistoryModel>(type);
    List<HistoryModel> Items = historyBox.values.toList();
    state = Items;
  }

  void addHistory(HistoryModel history, String type) async {
    //print("add history");
    // print(state);

    // add hive data
    final addBox = await Hive.openBox<HistoryModel>(type);
    addBox.add(history);

    // add memory data
    if (newsPost != null) {
      if (newsPost.length != 0) {
        List<HistoryModel> historyItems = state;
        historyItems.add(history);
        state = historyItems;
      } else {
        // print("[] です");
        List<HistoryModel> Items = addBox.values.toList();
        state = Items;
      }
    } else {
      // print("null です");
      List<HistoryModel> Items = addBox.values.toList();
      state = Items;
    }
  }

  void deleteHistory(String delId) async {
    //print("delete history");

    // delete hive data
    final delBox = await Hive.openBox<HistoryModel>('favorite');
    for (int index = 0; index < delBox.length; index++) {
      //print(index.toString() + ", " + favoriteBox.getAt(index).id);
      if (delBox.getAt(index).id == delId) {
        delBox.deleteAt(index);
        //break;
      }
    }

    // delete memory data
    if (newsPost != null) {
      if (newsPost.length != 0) {
        List<HistoryModel> historyItems = state;
        for (int index = 0; index < historyItems.length; index++) {
          if (historyItems[index].id == delId) {
            historyItems.removeAt(index);
          }
        }
        state = historyItems;
      } else {
        List<HistoryModel> Item = delBox.values.toList();
        state = Item;
      }
    } else {
      List<HistoryModel> Item = delBox.values.toList();
      state = Item;
    }
  }

  void getRanking(String type) async {
    var getPostURL = baseURL + "/v1/article/view/popular/" + type;
    print(getPostURL);
    http.Response response = await http.get(getPostURL);
    data = json.decode(response.body);

    newsPost = data["data"];
    _initReadFlg();
  }

  void getRecommended() async {
    historyBox = await Hive.openBox<HistoryModel>('history');
    List<HistoryModel> historyItems = historyBox.values.toList();

    if (historyItems.length == 0) {
      var getPostURL = baseURL + "/v1/article/view/popular/daily";
      http.Response response = await http.get(getPostURL);
      data = json.decode(response.body);

      newsPost = data["data"];
    } else {
      int index = 0;
      String ids = "";
      for (var item in historyItems.reversed) {
        if (ids == "") {
          ids = item.id;
        } else {
          ids = ids + "," + item.id;
        }
        index++;
        //直近閲覧した15の記事からレコメンドを作成
        if (index >= 15) {
          break;
        }
      }

      // var getPostURL = baseURL + "/personal?ids=" + ids;
      var getPostURL = baseURL + "/v1/article/view/popular/daily";
      print(getPostURL);
      http.Response response = await http.get(getPostURL);
      if(response.statusCode != 200){
        return;
      }
      data = json.decode(
          Utf8Decoder(allowMalformed: true).convert(response.bodyBytes));

      newsPost = data["data"];
    }
    _initReadFlg();
  }

  void searchResultsList(String searchwords) async {
    //String searchwords = textController.text;
    newsPost = [];
    //state = [];
    var getPostURL = baseURL + "/v1/article/search?keyword=" + searchwords;
    print(getPostURL);
    http.Response response = await http.get(getPostURL);
    data = json.decode(response.body);

    newsPost = data["data"];
    _initReadFlg();
  }
}
