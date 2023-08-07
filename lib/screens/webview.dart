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
// import 'package:admob_flutter/admob_flutter.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:flutter/material.dart';
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
  final String sitetitle;

  MatomeWebView(
      {Key? key, required this.title, required this.postID, required this.selectedUrl, required this.sitetitle})
      : super(key: key);

  @override
  _MatomeWebView createState() => _MatomeWebView();
}

class _MatomeWebView extends State<MatomeWebView> {
  WebViewController _controller = WebViewController();
  String baseURL = "https://matome.folks-chat.com";
  Map<String, dynamic> data = {};
  List recomPost = [];
  bool isOpen = false;
  double dist_threshold = 0.1;
  bool _isExpanded = true;
  String _deviceIdHash = "";
  final BannerAd banner = BannerAd(
    adUnitId: AdMobService().getBannerAdUnitId()!,
    size: AdSize.banner,
    request: AdRequest(),
    listener: BannerAdListener(),
  );

  final List<TabInfo> _tabs = [
    TabInfo(Icons.share, 'Share', Spacer()),
    TabInfo(Icons.report, 'Report article problem', Spacer()),
  ];

  @override
  void initState() {
    super.initState();
    print("initState");
    setDiveceIdHash();
  }

  @override
  Widget build(BuildContext context) {
    banner.load();
    AdWidget adWidget = AdWidget(ad: banner);
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
          future: loadUri(widget.selectedUrl, widget.sitetitle),
          builder: (BuildContext context, AsyncSnapshot<String> snapshot) {
            if (snapshot.hasData) {
              var commentFieldHeight = 60;
              var screenHeight = MediaQuery.of(context).size.height ?? 0;
              var appBarHeight = Scaffold.of(context).appBarMaxHeight ?? 0;
              var bottomBarHeight = AdMobService().getHeight(context).toInt() ?? 0;
              var viewInsets = EdgeInsets.fromWindowPadding(
                      WidgetsBinding.instance.window.viewInsets,
                      WidgetsBinding.instance.window.devicePixelRatio)
                  .bottom ?? 0;
              var notbodyHeight = appBarHeight + bottomBarHeight + viewInsets;
              // + commentFieldHeight;

              var expandedBodyHeight = screenHeight - notbodyHeight;
              var contractBodyHeight = expandedBodyHeight * 0.5;
              var controller = WebViewController()
                ..setJavaScriptMode(JavaScriptMode.unrestricted)
                ..loadRequest(Uri.parse(widget.selectedUrl));
              return Column(mainAxisSize: MainAxisSize.min, children: [
                Container(
                  height: _isExpanded
                      ? expandedBodyHeight
                      : contractBodyHeight, //contractBodyHeight, // 画面が
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.all(Radius.circular(25)),
                  ),
                  child: GestureDetector(
                    child: Scaffold(
                        resizeToAvoidBottomInset: false,
                        body: ClipRRect(
                          borderRadius: BorderRadius.all(Radius.circular(20)),
                        child: Scaffold(
                          appBar: AppBar(
                            title: Text(widget.title),
                          ),
                          body: WebViewWidget(controller: controller),
                        ),
                          // child: WebView(
                          //   javascriptMode: JavascriptMode.unrestricted,
                          //   onWebViewCreated:
                          //       (WebViewController webViewController) {
                          //     _controller = webViewController;
                          //     _controller.loadUrl(snapshot.data);
                          //     _getRecom(widget.postID);
                          //   },
                          // ),
                        ),
                        floatingActionButton: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
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
                      setState(() {
                        _isExpanded = true;
                      });
                      // return false;
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
        bottomNavigationBar: // SizedBox(),
            Container(
          alignment: Alignment.center,
          child: adWidget,
          width: banner.size.width.toDouble(),
          height: banner.size.height.toDouble(),
        ),
        //     AdWidget(
        //   ad: banner,
        // ),
        // AdmobBanner(
        //   adUnitId: AdMobService().getBannerAdUnitId(),
        //   adSize: AdmobBannerSize(
        //     width: MediaQuery.of(context).size.width.toInt(),
        //     height: AdMobService().getHeight(context).toInt(),
        //     name: 'BANNER',
        //   ),
        // ),
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
                          // "${recomPost[index]["publishedAt"]}",
                          "",
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
    var getRecomURL = baseURL + "/v1/article/similar/" + postID;
    print('getRecomURL: $getRecomURL');
    http.Response response = await http.get(Uri.parse(getRecomURL));
    data = json
        .decode(Utf8Decoder(allowMalformed: true).convert(response.bodyBytes));
    if (mounted) {
      setState(() {
        var postTmps = data["data"];
        if (postTmps != null) {
          for (var postTmp in postTmps) {
            if (postTmp != null) {
              recomPost.add(postTmp);
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

  NormalWebView({Key? key, required this.title, required this.selectedUrl}) : super(key: key);

  @override
  _NormalWebView createState() => _NormalWebView();
}

class _NormalWebView extends State<NormalWebView> {
  @override
  Widget build(BuildContext context) {
    var controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse(widget.selectedUrl));
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
      ),
      body: WebViewWidget(controller: controller),
    );
  }
}