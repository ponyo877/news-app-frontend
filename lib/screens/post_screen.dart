import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'news_card.dart';
import 'news_state.dart';

// https://qiita.com/taki4227/items/e3c7e640b7986a80b2f9
// https://qiita.com/najeira/items/454462c794c35b3b600a
class PostScreen extends StatelessWidget {
  // @override
  // bool get wantKeepAlive => true;

  final _kTabs = [
    //Tab(icon: Icon(Icons.fiber_new), text: 'Latest News'),
    //Tab(icon: Icon(Icons.recommend), text: 'Recommended News'),
    Center(child: Icon(Icons.fiber_new, size: 30)),
    Center(
        child: Row(children: [
      Icon(Icons.recommend, size: 30),
      SizedBox(width: 10),
      Text("for You")
    ], mainAxisAlignment: MainAxisAlignment.center)),
  ];

  @override
  Widget build(BuildContext context) {
    //print(context.runtimeType);

    return DefaultTabController(
      length: 2,
      initialIndex: 0,
      child: Scaffold(
        appBar: TabBar(
          //unselectedLabelColor: Colors.redAccent,
          indicatorSize: TabBarIndicatorSize.label,
          indicator: BoxDecoration(
              borderRadius: BorderRadius.circular(50), color: Colors.blueGrey),
          labelStyle: TextStyle(fontSize: 20),
          tabs: _kTabs,
        ),
        body: TabBarView(
          children: <Widget>[
            Center(
              child: LatestScreen(),
            ),
            Center(
              child: RecommendedScreen(),
            ),
          ],
        ),
      ),
    );
  }
}

class LatestScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    //print(context.runtimeType);

    return RefreshIndicator(
      onRefresh: () async {
        context.read(newsProvider.notifier).getPost(true);
      },
      child: Consumer(builder: (context, watch, _) {
        //print(context.runtimeType);
        final list = watch(newsProvider);
        print("[1]list.length: ${list.length}");
        Widget childWidget;
        if (list.length == 0) {
          childWidget = Center(child: CircularProgressIndicator());
        } else {
          childWidget = ListView.builder(
            physics: AlwaysScrollableScrollPhysics(),
            itemCount: list.length,
            itemBuilder: (BuildContext context, int index) {
              if (index == list.length - 1) {
                // print('list.length: ${list.length}');
                context.read(newsProvider.notifier).getPost(false);
                return new Center(
                  child: new Container(
                    margin: const EdgeInsets.only(top: 8.0),
                    width: 32.0,
                    height: 32.0,
                    child: const CircularProgressIndicator(),
                  ),
                );
              } else if (index > list.length) {
                print("[>]list.length: ${list.length}");
                return null;
              }
              return NewsCard(
                "${list[index]["id"]}",
                "${list[index]["image"]}",
                "${list[index]["publishedAt"]}",
                "${list[index]["siteID"]}",
                "${list[index]["sitetitle"]}",
                "${list[index]["titles"]}",
                "${list[index]["url"]}",
                list[index]["readFlg"],
                list[index]["favoriteFlg"],
              );
            },
          );
        }
        return childWidget;
      }),
    );
  }
}

class RecommendedScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    //print(context.runtimeType);

    return RefreshIndicator(
      onRefresh: () async {
        context.read(recommendedProvider.notifier).getRecommended();
      },
      child: Consumer(builder: (context, watch, _) {
        //print(context.runtimeType);
        final list = watch(recommendedProvider);
        Widget childWidget;
        if (list.length == 0) {
          childWidget = Center(child: CircularProgressIndicator());
        } else {
          childWidget = ListView.builder(
            physics: AlwaysScrollableScrollPhysics(),
            itemCount: list.length,
            itemBuilder: (BuildContext context, int index) {
              // if (index == list.length) {
              //   //print(list);
              //   context.read(recommendedProvider.notifier).getPost(false);
              //   return new Center(
              //     child: new Container(
              //       margin: const EdgeInsets.only(top: 8.0),
              //       width: 32.0,
              //       height: 32.0,
              //       child: const CircularProgressIndicator(),
              //     ),
              //   );
              // } else if (index > list.length) {
              //   return null;
              // }
              return NewsCard(
                "${list[index]["id"]}",
                "${list[index]["image"]}",
                "${list[index]["publishedAt"]}",
                "${list[index]["siteID"]}",
                "${list[index]["sitetitle"]}",
                "${list[index]["titles"]}",
                "${list[index]["url"]}",
                list[index]["readFlg"],
                list[index]["favoriteFlg"],
              );
            },
          );
        }
        return childWidget;
      }),
    );
  }
}
