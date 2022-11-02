import 'package:flutter/material.dart';
import 'webview.dart';
import 'package:http/http.dart' as http;
import 'package:cached_network_image/cached_network_image.dart';
import 'dart:async';
import 'package:hive/hive.dart';
import 'models/history_model.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'news_state.dart';
import 'package:google_fonts/google_fonts.dart';
import 'news_list_screen.dart';
import 'site_state.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';

class NewsCardInfo {
  Icon icon;
  String title;
  NewsCardInfo(
    this.icon,
    this.title,
  );
}

class NewsCard extends StatelessWidget {
  String id;
  String image;
  String publishedAt;
  String siteID;
  String sitetitle;
  String titles;
  String url;
  bool readFlg = false;
  bool favoriteFlg = false;
  static const String placeholderImg = 'assets/images/no_image_square.jpg';

  NewsCard(this.id, this.image, this.publishedAt, this.siteID, this.sitetitle,
      this.titles, this.url, this.readFlg, this.favoriteFlg);

  Future _addHistory(HistoryModel historyModel) async {
    final historyBox = await Hive.openBox<HistoryModel>('history');
    historyBox.add(historyModel);
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        mainAxisSize: MainAxisSize.max,
        children: <Widget>[
          new Container(
            child: ListTile(
              leading: thumbnail(this.image),
              title: title(this.titles,
                  this.readFlg ? Colors.grey : Colors.white, this.readFlg),
              subtitle: Wrap(
                  // mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  alignment: WrapAlignment.spaceBetween,
                  verticalDirection: VerticalDirection.up,
                  children: <Widget>[
                    subtitle(
                        DateFormat("yyyy-MM-dd HH:mm:ss").format(
                            DateFormat("yyyy-MM-ddTHH:mm:ssZ")
                                .parse(this.publishedAt, true)
                                .toLocal()),
                        this.readFlg ? Colors.grey : Colors.white),
                    subtitle(this.sitetitle,
                        this.readFlg ? Colors.grey : Colors.red[200]),
                  ]),
              // TODO: Need to implement favorite button
              trailing: this.publishedAt != ""
                  ? InkWell(
                      // ? IconButton(
                      // iconSize: 5,
                      child: Icon(Icons.more_vert),
                      //onPressed: () {
                      onTap: () => newsDetail(context))
                  : null,
              onTap: () {
                Navigator.of(context).push(MaterialPageRoute(
                    builder: (BuildContext context) => MatomeWebView(
                          title: titles,
                          postID: id,
                          selectedUrl: url,
                          siteID: siteID,
                        )));
                final newHistory = HistoryModel(
                  id,
                  image,
                  publishedAt,
                  siteID,
                  sitetitle,
                  titles,
                  url,
                ); // int.parse(_age));
                //_addHistory(newHistory);
                _incrViewCount(id);
                context.read(newsProvider.notifier).changeOneLatest(id);
                context.read(rankingMonthProvider.notifier).changeOneLatest(id);
                context.read(rankingWeekProvider.notifier).changeOneLatest(id);
                context.read(rankingDayProvider.notifier).changeOneLatest(id);
                context.read(recommendedProvider.notifier).changeOneLatest(id);
                context.read(searchResultProvider.notifier).changeOneLatest(id);
                context
                    .read(historyProvider.notifier)
                    .addHistory(newHistory, "history");
              },
            ),
          ),
        ],
      ),
    );
  }

  Future newsDetail(BuildContext context) async {
    final List<NewsCardInfo> _detailList = [
      NewsCardInfo(
          Icon(this.favoriteFlg ? Icons.favorite : Icons.favorite_border,
              color: this.favoriteFlg ? Colors.red : null),
          'Favorite'),
      NewsCardInfo(Icon(Icons.block), 'Block this site'),
      NewsCardInfo(Icon(Icons.report), 'Report this article'),
    ];
    return await showModalBottomSheet<void>(
        context: context,
        backgroundColor: Colors.blueGrey,
        isScrollControlled: true,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(15)),
        ),
        builder: (BuildContext context) {
          return Row(
            mainAxisSize: MainAxisSize.max,
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              Container(
                //color: Colors.red,
                //width: MediaQuery.of(context).size.width,
                height: MediaQuery.of(context).size.width / _detailList.length,
                child: ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    scrollDirection: Axis.horizontal,
                    itemCount: _detailList.length,
                    itemBuilder: (BuildContext context, int index) {
                      return SizedBox(
                        width: MediaQuery.of(context).size.width /
                            _detailList.length,
                        child: InkResponse(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                CircleAvatar(
                                    radius: 30,
                                    backgroundColor: Colors.white,
                                    child: _detailList[index].icon),
                                SizedBox(height: 10),
                                Text(_detailList[index].title)
                              ],
                            ),
                            onTap: () {
                              if (index == 0) {
                                Navigator.pop(context);
                                _clickFavorite(context);
                                newsDetail(context);
                              } else if (index == 1) {
                                _clickBlockSite(context);
                                //Navigator.pop(context);
                              } else if (index == 2) {
                                //Navigator.pop(context);
                                _clickReport(context);
                              }
                            }),
                      );
                    }),
              )
            ],
          );
        });
  }

  void _clickFavorite(BuildContext context) {
    if (!this.favoriteFlg) {
      //print('In ${this.titles}\'s Favorite Button!');
      final newfavorite = HistoryModel(
        this.id,
        this.image,
        this.publishedAt,
        this.siteID,
        this.sitetitle,
        this.titles,
        this.url,
      );
      //_addFavorite(newfavorite);
      context
          .read(favoriteProvider.notifier)
          .addHistory(newfavorite, "favorite");
    } else {
      //print('Out ${this.titles}\'s Favorite Button!');
      //_deleteFavorite(this.id);
      context.read(favoriteProvider.notifier).deleteHistory(this.id);
    }
    context
        .read(newsProvider.notifier)
        .changeOneFavorite(this.id, this.favoriteFlg);
    context
        .read(rankingMonthProvider.notifier)
        .changeOneFavorite(this.id, this.favoriteFlg);
    context
        .read(rankingWeekProvider.notifier)
        .changeOneFavorite(this.id, this.favoriteFlg);
    context
        .read(rankingDayProvider.notifier)
        .changeOneFavorite(this.id, this.favoriteFlg);
    context
        .read(recommendedProvider.notifier)
        .changeOneFavorite(this.id, this.favoriteFlg);
    context
        .read(searchResultProvider.notifier)
        .changeOneFavorite(this.id, this.favoriteFlg);
    // context
    //     .read(historyProvider.notifier)
    //     .changeOneFavorite(this.id, this.favoriteFlg);
    this.favoriteFlg = !this.favoriteFlg;
  }

  void _clickBlockSite(BuildContext context) {
    context
        .read(selectSiteProvider.notifier)
        .changeSiteList(int.parse(this.siteID), false);
    context.read(selectSiteProvider.notifier).writeJson();
    context.read(newsProvider.notifier).getPost(true);
  }

  void _clickReport(BuildContext context) async {
    var linkTitle = Uri.encodeComponent(this.titles);
    var link = Uri.encodeComponent(this.url);
    var url =
        "https://docs.google.com/forms/d/e/1FAIpQLSdbHG9M2IVrL1YTXg6pL1pk1GaDeUhm3_105Epp1UCjWO525w/viewform?usp=pp_url&entry.126191999=title%EF%BC%9A" +
            linkTitle +
            "%0AURL%EF%BC%9A" +
            link;
    print(url);
    await Navigator.of(context).push(MaterialPageRoute(
        builder: (context) => NormalWebView(
              title: "Report this article",
              selectedUrl: url,
            )));
  }

  title(title, color, readFlg) {
    return Text(
      title,
      style: TextStyle(
          fontSize: 15.0,
          color: color,
          fontWeight: readFlg ? FontWeight.w100 : FontWeight.w500),
      maxLines: 3,
      overflow: TextOverflow.ellipsis,
    );
  }

  subtitle(subTitle, color) {
    return Text(
      subTitle,
      style:
          TextStyle(fontSize: 12.5, color: color, fontWeight: FontWeight.w100),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }

  thumbnail(imageUrl) {
    return CachedNetworkImage(
      imageUrl: imageUrl,
      imageBuilder: (context, imageProvider) => Container(
        decoration: BoxDecoration(
          image: DecorationImage(
            image: imageProvider,
            fit: BoxFit.cover,
          ),
          // border: Border.all(color: Colors.white, width: 3),
          borderRadius: BorderRadius.circular(10),
        ),
      ),
      placeholder: (context, url) => Icon(Icons.error),
      errorWidget: (context, url, error) => Icon(Icons.error),
      // errorImage
      height: 60,
      width: 60,
      alignment: Alignment.center,
      // fit: BoxFit.cover,
    );
  }

  Future _incrViewCount(String id) async {
    var _incrViewCountURL = "https://matome-kun.ga/v1/article/view/";
    await http.post(_incrViewCountURL + id);
  }
}

class NewsRankingCard extends NewsCard {
  NewsRankingCard(
      String id,
      String image,
      String publishedAt,
      String siteID,
      String sitetitle,
      String titles,
      String url,
      bool readFlg,
      bool favoriteFlg)
      : super(id, image, publishedAt, siteID, sitetitle, titles, url, readFlg,
            favoriteFlg);

  @override
  thumbnail(rank) {
    return Text(
      rank,
      style: TextStyle(fontSize: 30.0, fontWeight: FontWeight.w500),
      maxLines: 2,
      overflow: TextOverflow.ellipsis,
    );
  }
}

class NewsHistoryCard extends NewsCard {
  NewsHistoryCard(
      String id,
      String image,
      String publishedAt,
      String siteID,
      String sitetitle,
      String titles,
      String url,
      bool readFlg,
      bool favoriteFlg)
      : super(id, image, publishedAt, siteID, sitetitle, titles, url, readFlg,
            favoriteFlg);

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        mainAxisSize: MainAxisSize.max,
        children: <Widget>[
          new Container(
            child: ListTile(
              leading: thumbnail(this.image),
              title: title(this.titles, Colors.white, false),
              subtitle: Wrap(
                  // mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  alignment: WrapAlignment.spaceBetween,
                  verticalDirection: VerticalDirection.up,
                  children: <Widget>[
                    subtitle(
                        DateFormat("yyyy-MM-dd HH:mm:ss").format(
                            DateFormat("yyyy-MM-ddTHH:mm:ssZ")
                                .parse(this.publishedAt, true)
                                .toLocal()),
                        Colors.white),
                    subtitle(this.sitetitle, Colors.red[200]),
                  ]),
              // TODO: Need to implement favorite button
              // trailing: widget.publishedAt != ""
              //     ? IconButton(
              //         icon: Icon(Icons.favorite_border),
              //         onPressed: () {
              //           print('Push ${widget.id}\'s Favorite Button!');
              //           final newfavorite = HistoryModel(
              //               widget.id,
              //               widget.image,
              //               widget.publishedAt,
              //               widget.siteID,
              //               widget.sitetitle,
              //               widget.titles,
              //               widget.url);
              //           _addFavorite(newfavorite);
              //         },
              //       )
              //     : null,
              onTap: () {
                final newHistory = HistoryModel(
                  this.id,
                  this.image,
                  this.publishedAt,
                  this.siteID,
                  this.sitetitle,
                  this.titles,
                  this.url,
                ); // int.parse(_age));
                _addHistory(newHistory);
                _incrViewCount(this.id);

                Navigator.of(context).push(MaterialPageRoute(
                    builder: (BuildContext context) => MatomeWebView(
                          title: titles,
                          postID: id,
                          selectedUrl: url,
                          siteID: siteID,
                        )));
              },
            ),
          ),
        ],
      ),
    );
  }
}
