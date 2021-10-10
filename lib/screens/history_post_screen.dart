import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'news_state.dart';
import 'news_card.dart';


// https://gist.github.com/tomasbaran/f6726922bfa59ffcf07fa8c1663f2efc
class HistoryPostScreen extends StatelessWidget {

  final _kTabs = [
    //Tab(icon: Icon(Icons.fiber_new), text: 'Latest News'),
    //Tab(icon: Icon(Icons.recommend), text: 'Recommended News'),
    Center(
        child: Row(children: [
          Icon(Icons.history, size: 30),
          SizedBox(width: 10),
          Text("History")
        ], mainAxisAlignment: MainAxisAlignment.center)),
    Center(
        child: Row(children: [
          Icon(Icons.favorite_border, size: 30),
          SizedBox(width: 10),
          Text("Favorite")
        ], mainAxisAlignment: MainAxisAlignment.center)),
  ];

  @override
  Widget build(BuildContext context) {

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
              child: MyHistoryPostScreen(),
            ),
            Center(
              child: MyFavoritePostScreen(),
            ),
          ],
        ),
      ),
    );
  }

}

class MyHistoryPostScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
        onRefresh: () async {
          context.read(historyProvider.notifier).initHistory("history");
        },
        child: Consumer(builder: (context, watch, _) {
          final list = watch(historyProvider);
          Widget childWidget;
          if (list.length == 0) {
            //childWidget = Center(child: CircularProgressIndicator());
            childWidget = ListView(children: [SizedBox(height: 10),Center(child: Text("閲覧履歴はありません"))]);
          } else {
            print("%%%%%%%%%%");
            childWidget = ListView.builder(
              physics: AlwaysScrollableScrollPhysics(),
              itemCount: list.length == null ? 0 : list.length,
              itemBuilder: (BuildContext context, int index) {
                var rindex = list.length - index - 1;
                return NewsHistoryCard(
                  "${list[rindex].id}", // "_id" is not available, so use "id"
                  "${list[rindex].image}",
                  "${list[rindex].publishedAt}",
                  "${list[rindex].siteID}",
                  "${list[rindex].sitetitle}",
                  "${list[rindex].titles}",
                  "${list[rindex].url}",
                  false,
                  false,
                );
              },
            );
          }
          return childWidget;
        }));
  }
}

class MyFavoritePostScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
        onRefresh: () async {
          context.read(favoriteProvider.notifier).initHistory("favorite");
        },
        child: Consumer(builder: (context, watch, _) {
          final list = watch(favoriteProvider);
          Widget childWidget;
          if (list.length == 0) {
            //childWidget = Center(child: CircularProgressIndicator());
            childWidget = ListView(children: [SizedBox(height: 10),Center(child: Text("お気に入りはありません"))]);
          } else {
            print("%%%%%%%%%%");
            childWidget = ListView.builder(
              physics: AlwaysScrollableScrollPhysics(),
              itemCount: list.length == null ? 0 : list.length,
              itemBuilder: (BuildContext context, int index) {
                var rindex = list.length - index - 1;
                return NewsHistoryCard(
                  "${list[rindex].id}", // "_id" is not available, so use "id"
                  "${list[rindex].image}",
                  "${list[rindex].publishedAt}",
                  "${list[rindex].siteID}",
                  "${list[rindex].sitetitle}",
                  "${list[rindex].titles}",
                  "${list[rindex].url}",
                  false,
                  false,
                );
              },
            );
          }
          return childWidget;
        }));
  }
}
