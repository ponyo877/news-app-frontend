import 'news_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'news_state.dart';

class SearchPostScreen extends StatelessWidget {

  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: <Widget>[
            Padding(
              padding:
                  const EdgeInsets.only(left: 30.0, right: 30.0, bottom: 30.0),
              child: TextField(
                //controller: somethingController,
                onChanged: (text) {
                  context.read(searchResultProvider.notifier).searchResultsList(text);
                },
                decoration: InputDecoration(prefixIcon: Icon(Icons.search)),
              ),
            ),
            Expanded(
                child: Consumer(builder: (context, watch, _) {
                  final list = watch(searchResultProvider);
                  Widget childWidget;
                      if (list == null) {
                        childWidget = Container();
                      } else if (list.length == 0) {
                        childWidget =
                            Center(child: CircularProgressIndicator());
                      } else {
                        childWidget = ListView.builder(
                          // physics: AlwaysScrollableScrollPhysics(),
                          itemCount: list == null ? 0 : list.length,
                          itemBuilder: (BuildContext context, int index) {
                            return NewsCard(
                              "${list[index]["id"] == "" ? list[index]["id"] : list[index]["id"]}",
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
                    }))
          ],
        ),
      ),
    );
  }
}
