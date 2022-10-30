import 'dart:io';
import 'dart:math';
import 'dart:async';
import 'dart:convert';
import 'news_card.dart';
import 'news_list_screen.dart';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:webview_flutter/webview_flutter.dart';

import '../service/admob.dart';
import 'package:admob_flutter/admob_flutter.dart';
import 'package:flutter_share/flutter_share.dart';
import 'webview_tools.dart';
import 'comment_screen.dart';
import 'comment/get_device_hash.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'comment/comment_state.dart';

// WebViewController _controller;
class MatomeWebView extends StatefulWidget {
  final String title;
  final String postID;
  final String selectedUrl;
  final String siteID;

  MatomeWebView(
      {Key key, this.title, this.postID, this.selectedUrl, this.siteID})
      : super(key: key);

  @override
  _MatomeWebView createState() => _MatomeWebView();
}

class _MatomeWebView extends State<MatomeWebView> {
  var notLiveDoorIDs = [
    2,
  ];
  // add_20201227
  WebViewController _controller;
  String baseURL = "https://matome-kun.ga";
  Map<String, dynamic> data;
  List recomPost = [];
  bool isOpen = false;
  double dist_threshold = 0.1;
  bool _isExpanded = false;
  String _deviceIdHash;

  final List<TabInfo> _tabs = [
    TabInfo(Icons.share, 'Share', null),
    TabInfo(Icons.report, 'Report article problem', null),
  ];

  @override
  void initState() {
    super.initState();
    print("initState");
    setDiveceIdHash();
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () {
        context.read(commentProvider.notifier).clearComments();
        Navigator.pop(context);
        return Future.value(false);
      },
      child: Scaffold(
        resizeToAvoidBottomInset: true,
        appBar: AppBar(
          title: Text(widget.title),
          actions: <Widget>[
            PopupMenuButton(onSelected: (String s) async {
              if (s == _tabs[0].title) {
                await FlutterShare.share(
                  title: widget.title,
                  text: "title: " + widget.title,
                  linkUrl: "URL: " + widget.selectedUrl,
                );
              } else if (s == _tabs[1].title) {
                var linkTitle = Uri.encodeComponent(widget.title);
                var link = Uri.encodeComponent(widget.selectedUrl);
                var url =
                    "https://docs.google.com/forms/d/e/1FAIpQLSdbHG9M2IVrL1YTXg6pL1pk1GaDeUhm3_105Epp1UCjWO525w/viewform?usp=pp_url&entry.126191999=title%EF%BC%9A" +
                        linkTitle +
                        "%0AURL%EF%BC%9A" +
                        link;
                await Navigator.of(context).push(MaterialPageRoute(
                    builder: (context) => NormalWebView(
                          title: s,
                          selectedUrl: url,
                        )));
              }
            }, itemBuilder: (BuildContext context) {
              return _tabs.map((tab) {
                return PopupMenuItem(
                  //child: tab.widget,
                  child: Row(children: <Widget>[
                    Icon(tab.icon),
                    SizedBox(width: 10),
                    Text(tab.title)
                  ]),
                  value: tab.title,
                );
              }).toList();
            })
          ],
        ),
        body: FutureBuilder(
          future: loadUri(widget.selectedUrl, widget.siteID),
          builder: (BuildContext context, AsyncSnapshot<String> snapshot) {
            if (snapshot.hasData) {
              var commentFieldHeight = 60;
              var screenHeight = MediaQuery.of(context).size.height;
              var appBarHeight = Scaffold.of(context).appBarMaxHeight;
              var bottomBarHeight = AdMobService().getHeight(context).toInt();
              var viewInsets = EdgeInsets.fromWindowPadding(WidgetsBinding.instance.window.viewInsets,WidgetsBinding.instance.window.devicePixelRatio).bottom;
              var notbodyHeight = appBarHeight + bottomBarHeight + commentFieldHeight + viewInsets;

              var expandedBodyHeight = screenHeight - notbodyHeight;
              var contractBodyHeight = expandedBodyHeight * 0.5;
              print('contractBodyHeight: $contractBodyHeight');
              return Column(mainAxisSize: MainAxisSize.min, children: [
                Container(
                  height: _isExpanded ? expandedBodyHeight : contractBodyHeight,
                  decoration: BoxDecoration(
                    // border: Border.all(color: Colors.blueGrey, width: 5),
                    borderRadius: BorderRadius.all(Radius.circular(25)),
                  ),
                  child: GestureDetector(
                    child: Scaffold(
                        resizeToAvoidBottomInset: false,
                        body: ClipRRect(
                          borderRadius: BorderRadius.all(Radius.circular(20)),
                          child: WebView(
                            // initialUrl: widget.selectedUrl,
                            javascriptMode: JavascriptMode.unrestricted,
                            onWebViewCreated:
                                (WebViewController webViewController) {
                              // controller.complete(webViewController);
                              _controller = webViewController;
                              // print(snapshot.data);
                              _controller.loadUrl(snapshot.data);
                              _getRecom(widget.postID);
                            },
                          ),
                        ),
                        floatingActionButton: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          // mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Expanded(child: SizedBox()),
                            Spacer(),
                            ElevatedButton(
                              onPressed: () {
                                setState(() {
                                  print(_isExpanded);
                                  _isExpanded = !_isExpanded;
                                });
                              },
                              child: Text(
                                _isExpanded ? 'コメントを開く' : '記事を開く',
                                maxLines: 1,
                              ),
                            ),
                            Spacer(),
                            Expanded(
                              child: recomPost.isNotEmpty
                                  ? Builder(
                                      builder: (context) =>
                                          _getRecomButton(context),
                                    )
                                  : SizedBox(),
                            )
                          ],
                        )),
                    onTapDown: (details) {
                      print("test");
                      setState(() {
                        print(_isExpanded);
                        _isExpanded = true;
                      });
                      return false;
                    },
                    behavior: HitTestBehavior.opaque,
                  ),
                ),
                _isExpanded
                    ? SizedBox()
                    : CommentScreen(
                        articleID: widget.postID, deviceHash: _deviceIdHash),
              ]);
            } else {
              return new Center(
                child: new Container(
                  margin: const EdgeInsets.only(top: 8.0),
                  width: 32.0,
                  height: 32.0,
                  child: const CircularProgressIndicator(),
                ),
              );
            }
          },
        ),
        bottomNavigationBar: AdmobBanner(
          adUnitId: AdMobService().getBannerAdUnitId(),
          adSize: AdmobBannerSize(
            width: MediaQuery.of(context).size.width.toInt(),
            height: AdMobService().getHeight(context).toInt(),
            name: 'BANNER',
          ),
        ),
      ),
    );
  }

  _getRecomButton(BuildContext context) {
    return FloatingActionButton(
      backgroundColor: Colors.black,
      child: Icon(Icons.bolt, color: Colors.amberAccent, size: 50),
      onPressed: () async {
        if (isOpen) {
          Navigator.pop(context);
          setState(() {
            isOpen = false;
          });
        } else {
          print('Push Bolt Button!');
          Scaffold.of(context).showBottomSheet<void>(
            (BuildContext context) {
              return Container(
                  height: 120, //MediaQuery.of(context).size.height * 0.1,
                  child: ListView.builder(
                    shrinkWrap: true,
                    // padding: EdgeInsets.all(20),
                    itemCount: recomPost.length,
                    scrollDirection: Axis.horizontal,
                    physics: AlwaysScrollableScrollPhysics(),
                    itemBuilder: (BuildContext context, int index) {
                      return Container(
                        width: MediaQuery.of(context).size.width * 0.6,
                        child: NewsCard(
                          "${recomPost[index]["id"]}",
                          "${recomPost[index]["image"]}",
                          "",
                          // "${recomPost[index]["publishedAt"]}",
                          "${recomPost[index]["siteID"]}",
                          "${recomPost[index]["sitetitle"]}",
                          "${recomPost[index]["titles"]}",
                          "${recomPost[index]["url"]}",
                          false,
                          false,
                        ),
                      );
                    },
                  ));
            },
          );
          setState(() {
            isOpen = true;
          });
        }
      },
    );
  }

  Future setDiveceIdHash() async {
    var digest = await getDeviceIdHash();
    if (mounted) {
      setState(() {
        _deviceIdHash = digest;
      });
    }
  }

  Future _getRecom(String postID) async {
    // var getRecomURL = baseURL + "/recom/" + postID;
    var getRecomURL = baseURL + "/v1/article/view/popular/daily";
    print('getRecomURL: $getRecomURL');
    http.Response response = await http.get(getRecomURL);
    data = json
        .decode(Utf8Decoder(allowMalformed: true).convert(response.bodyBytes));
    if (mounted) {
      setState(() {
        var postTmps = data["data"];
        if (postTmps != null) {
          for (var postTmp in postTmps) {
            if (postTmp != null) {
              if (postTmp["distance"] > dist_threshold) {
                recomPost.add(postTmp);
              }
            }
          }
        }
      });
    }
  }
}

class NormalWebView extends StatefulWidget {
  final String title;
  final String selectedUrl;

  NormalWebView({Key key, this.title, this.selectedUrl}) : super(key: key);

  @override
  _NormalWebView createState() => _NormalWebView();
}

class _NormalWebView extends State<NormalWebView> {
  final Completer<WebViewController> _controller =
      Completer<WebViewController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
      ),
      body: Builder(builder: (BuildContext context) {
        return WebView(
          initialUrl: widget.selectedUrl,
          javascriptMode: JavascriptMode.unrestricted,
          onWebViewCreated: (WebViewController webViewController) {
            _controller.complete(webViewController);
          },
        );
      }),
    );
  }
}
