import 'package:flutter/material.dart';
import 'news_card.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'news_state.dart';

class RankingPostScreen extends StatelessWidget {

  final _kTabs = [
    //Tab(icon: Icon(Icons.fiber_new), text: 'Latest News'),
    //Tab(icon: Icon(Icons.recommend), text: 'Recommended News'),
    Center(child: Text("Daily")),
    Center(child: Text("Weekly")),
    Center(child: Text("Monthly")),
  ];

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      initialIndex: 0,
      child: Scaffold(
        appBar: TabBar(
          //unselectedLabelColor: Colors.redAccent,
          indicatorSize: TabBarIndicatorSize.label,
          indicator: BoxDecoration(
              borderRadius: BorderRadius.circular(50), color: Colors.blueGrey),
          labelStyle: TextStyle(fontSize: 18),
          tabs: _kTabs,
        ),
        body: TabBarView(
          children: <Widget>[
            Center(
              child: EachRankingPostScreen(rankingDayProvider, "daily"),
            ),
            Center(
              child: EachRankingPostScreen(rankingWeekProvider, "weekly"),
            ),
            Center(
              child: EachRankingPostScreen(rankingMonthProvider,"monthly"),
            ),
          ],
        ),
      ),
    );
  }

}

class EachRankingPostScreen extends StatelessWidget {
  EachRankingPostScreen(this.provider, this.type);
  final String type;
  final provider;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {
        context.read(provider.notifier).getRanking(type);
      },
      child: Consumer(builder: (context, watch, _) {
        final list = watch(provider);
        Widget childWidget;
        if (list.length == 0) {
          childWidget = Center(child: CircularProgressIndicator());
        } else {
          childWidget = ListView.builder(
            physics: AlwaysScrollableScrollPhysics(),
            itemCount: list == null ? 0 : list.length,
            itemBuilder: (BuildContext context, int index) {
              // "${index + 1}",
              return NewsRankingCard(
                "${list[index]["id"] == "" ? list[index]["id"] : list[index]["id"]}",
                "${index + 1}",
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
