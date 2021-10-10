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

class NewsCard extends StatelessWidget {
  String _id;
  String image;
  String publishedAt;
  String siteID;
  String sitetitle;
  String titles;
  String url;
  //bool colorChange = true;
  bool readFlg = false;
  bool favoriteFlg = false;
  static const String placeholderImg = 'assets/images/no_image_square.jpg';

  NewsCard(this._id, this.image, this.publishedAt, this.siteID, this.sitetitle,
      this.titles, this.url, this.readFlg, this.favoriteFlg);

  Future _addHistory(HistoryModel historyModel) async {
    final historyBox = await Hive.openBox<HistoryModel>('history');
    historyBox.add(historyModel);
  }

  Future _addFavorite(HistoryModel historyModel) async {
    final favoriteBox = await Hive.openBox<HistoryModel>('favorite');
    favoriteBox.add(historyModel);
    print(favoriteBox.length);
  }

  Future _deleteFavorite(String FavoriteId) async {
    final favoriteBox = await Hive.openBox<HistoryModel>('favorite');
    for (int index = 0; index < favoriteBox.length; index++) {
      //print(index.toString() + ", " + favoriteBox.getAt(index).id);
      if (favoriteBox.getAt(index).id == FavoriteId) {
        favoriteBox.deleteAt(index);
        //break;
      }
    }
    //print(favoriteBox.length);
  }

  @override
  Widget build(BuildContext context) {
    //bloc = NewsBlocProvider.of(context).bloc;
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
                    subtitle(this.publishedAt,
                        this.readFlg ? Colors.grey : Colors.white),
                    subtitle(this.sitetitle,
                        this.readFlg ? Colors.grey : Colors.red[200]),
                  ]),
              // TODO: Need to implement favorite button
              trailing: this.publishedAt != ""
                  ? InkWell(
                      // ? IconButton(
                      // iconSize: 5,
                      child: Icon(
                          // icon: Icon(
                          this.favoriteFlg
                              ? Icons.favorite
                              : Icons.favorite_border,
                          color: this.favoriteFlg ? Colors.red : null),
                      //onPressed: () {
                      onTap: () {
                        if (!this.favoriteFlg) {
                          //print('In ${this.titles}\'s Favorite Button!');
                          final newfavorite = HistoryModel(
                            this._id,
                            this.image,
                            this.publishedAt,
                            this.siteID,
                            this.sitetitle,
                            this.titles,
                            this.url,
                          );
                          _addFavorite(newfavorite);
                          context
                              .read(favoriteProvider.notifier)
                              .addHistory(newfavorite);
                        } else {
                          //print('Out ${this.titles}\'s Favorite Button!');
                          _deleteFavorite(this._id);
                          context
                              .read(favoriteProvider.notifier)
                              .deleteHistory(this._id);
                        }
                        context
                            .read(newsProvider.notifier)
                            .changeOneFavorite(this._id, this.favoriteFlg);
                        context
                            .read(rankingMonthProvider.notifier)
                            .changeOneFavorite(this._id, this.favoriteFlg);
                        context
                            .read(rankingWeekProvider.notifier)
                            .changeOneFavorite(this._id, this.favoriteFlg);
                        context
                            .read(rankingDayProvider.notifier)
                            .changeOneFavorite(this._id, this.favoriteFlg);
                        context
                            .read(recommendedProvider.notifier)
                            .changeOneFavorite(this._id, this.favoriteFlg);
                        // context
                        //     .read(historyProvider.notifier)
                        //     .changeOneFavorite(this._id, this.favoriteFlg);
                      },
                    )
                  : null,
              onTap: () {
                Navigator.of(context).push(MaterialPageRoute(
                    builder: (BuildContext context) => MatomeWebView(
                          title: titles,
                          postID: _id,
                          selectedUrl: url,
                          siteID: siteID,
                        )));
                final newHistory = HistoryModel(
                  _id,
                  image,
                  publishedAt,
                  siteID,
                  sitetitle,
                  titles,
                  url,
                ); // int.parse(_age));
                _addHistory(newHistory);
                context.read(newsProvider.notifier).changeOneLatest(_id);
                context
                    .read(rankingMonthProvider.notifier)
                    .changeOneLatest(_id);
                context.read(rankingWeekProvider.notifier).changeOneLatest(_id);
                context.read(rankingDayProvider.notifier).changeOneLatest(_id);
                context.read(recommendedProvider.notifier).changeOneLatest(_id);
                context.read(historyProvider.notifier).addHistory(newHistory);
                _incrViewCount(_id);
              },
            ),
          ),
        ],
      ),
    );
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
    var _incrViewCountURL = "http://gitouhon-juku-k8s2.ga/redis/put/";
    await http.get(_incrViewCountURL + id);
  }
}

class NewsRankingCard extends NewsCard {
  NewsRankingCard(
      String _id,
      String image,
      String publishedAt,
      String siteID,
      String sitetitle,
      String titles,
      String url,
      bool readFlg,
      bool favoriteFlg)
      : super(_id, image, publishedAt, siteID, sitetitle, titles, url, readFlg,
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
      String _id,
      String image,
      String publishedAt,
      String siteID,
      String sitetitle,
      String titles,
      String url,
      bool readFlg,
      bool favoriteFlg)
      : super(_id, image, publishedAt, siteID, sitetitle, titles, url, readFlg,
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
                    subtitle(this.publishedAt, Colors.white),
                    subtitle(this.sitetitle, Colors.red[200]),
                  ]),
              // TODO: Need to implement favorite button
              // trailing: widget.publishedAt != ""
              //     ? IconButton(
              //         icon: Icon(Icons.favorite_border),
              //         onPressed: () {
              //           print('Push ${widget._id}\'s Favorite Button!');
              //           final newfavorite = HistoryModel(
              //               widget._id,
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
                  this._id,
                  this.image,
                  this.publishedAt,
                  this.siteID,
                  this.sitetitle,
                  this.titles,
                  this.url,
                ); // int.parse(_age));
                _addHistory(newHistory);
                _incrViewCount(this._id);

                Navigator.of(context).push(MaterialPageRoute(
                    builder: (BuildContext context) => MatomeWebView(
                          title: titles,
                          postID: _id,
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
