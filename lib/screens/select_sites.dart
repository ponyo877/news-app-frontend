import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:async';
import 'dart:convert';
import 'package:cached_network_image/cached_network_image.dart';
import 'dart:io';
import 'package:path_provider/path_provider.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'site_state.dart';
import 'news_state.dart';

class SelectSites extends StatelessWidget {

  Future<bool> _future = false as Future<bool>;

  String baseURL = "https://matome.folks-chat.com";
  Map<String, dynamic> data = {};
  List newsList = [];

  File _filePath = File("");
  static const String kFileName = 'mySkipIDs.csv';

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () {
        context.read(selectSiteProvider.notifier).writeJson();
        context.read(newsProvider.notifier).getPost(true);
        Navigator.pop(context);
        return Future.value(false);
      },
      child: Scaffold(
          appBar: AppBar(
            title: Text('表示サイトの選択'),
          ),
          body: Consumer(builder: (context, watch, _) {
            final list = watch(selectSiteProvider);
            Widget childWidget;
            if (list.length == 0) {
              childWidget = Center(child: CircularProgressIndicator());
            } else {
              childWidget = ListView.builder(
                itemBuilder: (BuildContext context, int index) {
                  return Container(
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(color: Colors.black38),
                        ),
                      ),
                      child: SwitchListTile(
                        value: list[index]["switchValue"],
                        title: Text(
                          "${list[index]["titles"]}",
                          style: TextStyle(
                          ),
                        ),
                        onChanged: (bool value) {
                          context.read(selectSiteProvider.notifier)
                              .changeSiteList(list[index]["id"], value);
                        },
                        secondary: thumbnail(list[index]["image"]),
                      )
                  );
                },
                itemCount: list.length,
              );
            }
            return childWidget;
          }
          )
      ),
    );
  }

  thumbnail(imageUrl) {
    return Padding(
      padding: EdgeInsets.only(left: 15.0),
      child: CachedNetworkImage(
        imageUrl: imageUrl,
        placeholder: (context, url) => Icon(Icons.error),
        //=> Image.asset(placeholderImg),
        errorWidget: (context, url, error) => Icon(Icons.error),
        // errorImage
        height: 50,
        width: 50,
        alignment: Alignment.center,
        fit: BoxFit.fill,
      ),
    );
  }
}