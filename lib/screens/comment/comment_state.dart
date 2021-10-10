import 'dart:async';
import 'package:http/http.dart' as http;
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'dart:convert';
import 'package:hive/hive.dart';
import 'package:state_notifier/state_notifier.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final commentProvider = StateNotifierProvider((ref) => CommentState());

class CommentState extends StateNotifier<List> {
  // NewsState() : super([]);
  CommentState() : super([]) {
    commentList = [];
  }

  List commentList = [];
  String baseURL = "http://gitouhon-juku-k8s2.ga";

  getComments(String articleID) async {
    var getCommentURL = baseURL + "/comment/get?articleID=" + articleID;
    //print('getCommentURL: $getCommentURL');
    http.Response response = await http.get(getCommentURL);
    var data = json.decode(response.body);
    commentList = data["data"];

    if (commentList == null) {
      state = ["nodata"];
    } else {
      state = commentList;
    }
  }

  clearComments() async {
    state = [];
  }
}
