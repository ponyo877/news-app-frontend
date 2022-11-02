import 'chat_theme.dart';
import 'get_device_hash.dart';
import 'package:flutter/material.dart';
import 'package:device_info/device_info.dart';
import 'dart:io';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'comment_state.dart';

// https://konifar.hatenablog.com/entry/2018/02/11/081031
// https://zenn.dev/hayabusabusa/articles/7bf73f007584aa4e0ee8
class Conversation extends StatelessWidget {
  Conversation({Key key, @required this.articleID, @required this.deviceHash})
      : super(key: key);

  final String articleID;
  final String deviceHash;

  String baseURL = "https://matome-kun.ga";

  @override
  Widget build(BuildContext context) {
    context.read(commentProvider.notifier).getComments(this.articleID);
    return Consumer(builder: (context, watch, _) {
      final commentList = watch(commentProvider);
      var num_comment = commentList == null ? 0 : commentList.length;
      if (commentList.length == 0) {
        return Center(child: CircularProgressIndicator());
      } else if (commentList[0] == "nodata") {
        return ListView(children: [
          SizedBox(height: 10),
          Center(
              child: Text("コメントはありません", style: TextStyle(color: Colors.black)))
        ]);
      } else {
        print("%%%%%%%%%%");
        return ListView.builder(
            reverse: false, // コメント順: 新規が下
            itemCount: num_comment,
            itemBuilder: (context, int index) {
              print('commentList[index] ${commentList[index]}');
              final comment = commentList[index];
              bool isMe = comment["device_hash"] == this.deviceHash;
              return Container(
                margin: EdgeInsets.only(top: 10),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: isMe
                          ? MainAxisAlignment.end
                          : MainAxisAlignment.start,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        if (!isMe)
                          CircleAvatar(
                            radius: 15,
                            backgroundColor: Colors.white,
                            backgroundImage:
                                comment["image_url"].startsWith('http')
                                    ? NetworkImage(comment["image_url"])
                                    : AssetImage(comment["image_url"]),
                          ),
                        SizedBox(
                          width: 10,
                        ),
                        Container(
                            padding: EdgeInsets.all(10),
                            constraints: BoxConstraints(
                                maxWidth:
                                    MediaQuery.of(context).size.width * 0.75),
                            decoration: BoxDecoration(
                                color: isMe
                                    ? MyTheme.kAccentColor
                                    : Colors.grey[200],
                                borderRadius: BorderRadius.only(
                                  topLeft: Radius.circular(15),
                                  topRight: Radius.circular(15),
                                  bottomLeft: Radius.circular(isMe ? 15 : 0),
                                  bottomRight: Radius.circular(isMe ? 0 : 15),
                                )),
                            child: Column(
                              children: [
                                if (!isMe)
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        comment["name"],
                                        textAlign: TextAlign.right,
                                        style:
                                            MyTheme.headerTextMessage.copyWith(
                                          color: Colors.lightBlue,
                                        ),
                                      ),
                                      SizedBox(width: 10),
                                      Text(
                                          comment["device_hash"].substring(0, 6),
                                          textAlign: TextAlign.right,
                                          style: MyTheme.headerTextMessage
                                              .copyWith(
                                            color: Colors.grey[400],
                                          )),
                                    ],
                                  ),
                                Text(
                                  comment["message"],
                                  textAlign: TextAlign.left,
                                  style: MyTheme.bodyTextMessage.copyWith(
                                      color: isMe
                                          ? Colors.white
                                          : Colors.grey[800]),
                                )
                              ],
                            )),
                      ],
                    ),
                    Padding(
                      padding: const EdgeInsets.only(top: 5),
                      child: Row(
                        mainAxisAlignment: isMe
                            ? MainAxisAlignment.end
                            : MainAxisAlignment.start,
                        children: [
                          if (!isMe)
                            SizedBox(
                              width: 40,
                            ),
                          Text(
                            comment["created_at"],
                            style: MyTheme.bodyTextTime,
                          ),
                          if (!isMe)
                            SizedBox(
                              width: 5,
                            ),
                          if (!isMe)
                            GestureDetector(
                              child: Icon(Icons.announcement_rounded,
                                  color: Color(0xffAEABC9)),
                              onTap: () {
                                showDialog(
                                  context: context,
                                  builder: (BuildContext context) =>
                                      new AlertDialog(
                                    title: Text("通報理由を入力してください"),
                                    content: Container(
                                        child: Column(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                          Text('user: ' + comment["name"]),
                                          Text(
                                              'message: ' + comment["message"]),
                                          ReportDropdown(dropdownList: <String>[
                                            '通報理由を選択',
                                            '性的な内容',
                                            '出会い目的',
                                            '荒らし',
                                            '他アプリへの移動',
                                            '勧誘・営業',
                                            '犯罪行為',
                                            'その他'
                                          ]),
                                          Text("通報内容はアプリ管理者に報告されます"),
                                        ])),
                                    // ボタンの配置
                                    actions: <Widget>[
                                      new TextButton(
                                          child: const Text('キャンセル'),
                                          onPressed: () {
                                            print('Cancel!');
                                            Navigator.pop(context);
                                          }),
                                      new TextButton(
                                          child: const Text('通報'),
                                          onPressed: () {
                                            print('Ok!');
                                            execWebHook(comment["message"],
                                                comment["id"]);
                                            Navigator.pop(context);
                                          })
                                    ],
                                  ),
                                );
                              },
                            )
                        ],
                      ),
                    )
                  ],
                ),
              );
            });
      }
    });
  }

  Future execWebHook(String message, String commentID) async {
    Codec<String, String> stringToBase64Url = utf8.fuse(base64Url);
    var encodedWebHookURL = 'aHR0cHM6Ly9ob29rcy5zbGFjay5jb20vc2VydmljZXMvVDAyNFA1SFNCRjAvQjAyNFBBNUtHRUEvNHJ5a3NLWTFOZ0FYaUFkSDloQ1ZJNGpn';
    var slackWebhookURL = stringToBase64Url.decode(encodedWebHookURL);
    print('slackWebhookURL: $slackWebhookURL');
    var reportText = '*以下のコメントが通報されました*\n- articleID: ' +
        this.articleID +
        '\n- CommentID: ' +
        commentID +
        '\n- 本文: ' +
        message +
        '\n削除コマンド: `db.article_col.update({id: ObjectId("' +
        this.articleID +
        '")}, {\$pull: {\'comments\': {commentID: \'' +
        commentID +
        '\'}}})`';
    String body = json.encode({'text': reportText});
    http.Response res = await http.post(slackWebhookURL, body: body);
  }

  // Future getComments() async {
  //   var getCommentURL = baseURL + "/comment/get?articleID=" + widget.articleID;
  //   print('getCommentURL: $getCommentURL');
  //   http.Response response = await http.get(getCommentURL);
  //   var data = json.decode(response.body);
  //   if (mounted) {
  //     setState(() {
  //       commentList = data["data"];
  //     });
  //   }
  // }
}

class ReportDropdown extends StatefulWidget {
  const ReportDropdown({
    Key key,
    @required this.dropdownList,
  }) : super(key: key);

  @override
  State<ReportDropdown> createState() => _ReportDropdown();
  final List<String> dropdownList;
}

/// This is the private State class that goes with MyStatefulWidget.
class _ReportDropdown extends State<ReportDropdown> {
  String dropdownValue = '通報理由を選択';

  @override
  Widget build(BuildContext context) {
    return DropdownButton<String>(
      value: dropdownValue,
      icon: const Icon(Icons.arrow_drop_down),
      iconSize: 24,
      elevation: 16,
      onChanged: (String newValue) {
        setState(() {
          dropdownValue = newValue;
        });
      },
      items: widget.dropdownList.map<DropdownMenuItem<String>>((String value) {
        return DropdownMenuItem<String>(
          value: value,
          child: Text(
            value,
            style: TextStyle(
                color: value == "通報理由を選択" ? Colors.grey : Colors.white),
          ),
        );
      }).toList(),
    );
  }
}
