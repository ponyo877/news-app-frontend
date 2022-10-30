import 'package:hive/hive.dart';

part 'history_model.g.dart';

@HiveType(typeId: 1)
/*
id
image
publishedAt
siteID
sitetitle
titles
url
 */
class HistoryModel {
  HistoryModel(this.id, this.image, this.publishedAt, this.siteID, this.sitetitle, this.titles, this.url);

  @HiveField(0)
  final String id;

  @HiveField(1)
  final String image;

  @HiveField(2)
  final String publishedAt;

  @HiveField(3)
  final String siteID;

  @HiveField(4)
  final String sitetitle;

  @HiveField(5)
  final String titles;

  @HiveField(6)
  final String url;
}