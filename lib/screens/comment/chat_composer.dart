import 'package:flutter/material.dart';
import 'chat_theme.dart';
import 'package:http/http.dart' as http;
import 'package:flutter/services.dart';
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'comment_state.dart';

class buildChatComposer extends StatelessWidget {
  buildChatComposer(
      {Key key, @required this.articleID, @required this.deviceHash})
      : super(key: key);

  final String articleID;
  final String deviceHash;

// https://github.com/cybdom/messengerish
// https://github.com/itzpradip/flutter-chat-app
// https://github.com/tonydavidx/chattie-ui-design
  var _controller = TextEditingController();
  String baseURL = "https://matome-kun.ga";

  @override
  Widget build(BuildContext context) {
    // https://stackoverflow.com/questions/49269319/get-keyboard-height-in-flutter
    // var bottomHeight = MediaQuery.of(context).viewInsets.bottom;
    // print('bottomHeight: $bottomHeight');
    // var viewInsets = EdgeInsets.fromWindowPadding(WidgetsBinding.instance.window.viewInsets,WidgetsBinding.instance.window.devicePixelRatio);
    // print('viewInsets.bottom: ${viewInsets.bottom}');
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 20),
      color: Colors.white,
      height: 60,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Expanded(
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 14),
              height: 40,
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(15),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 10,
                  ),
                  Expanded(
                    child: TextField(
                      keyboardType: TextInputType.multiline,
                      maxLines: null,
                      // maxLength: 10,
                      inputFormatters: [
                        LengthLimitingTextInputFormatter(50),
                      ],
                      style: TextStyle(color: Colors.black),
                      controller: _controller,
                      decoration: InputDecoration(
                        border: InputBorder.none,
                        hintText: 'コメントを書く ✍',
                        hintStyle: TextStyle(color: Colors.grey[500]),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SizedBox(
            width: 16,
          ),
          GestureDetector(
            child: CircleAvatar(
              backgroundColor: MyTheme.kAccentColor,
              child: Icon(
                Icons.send,
                color: Colors.white,
              ),
            ),
            onTap: () async {
              final FocusScopeNode currentScope = FocusScope.of(context);
              if (!currentScope.hasPrimaryFocus && currentScope.hasFocus) {
                FocusManager.instance.primaryFocus.unfocus();
              }
              var message = _controller.text;
              var putCommentURL = baseURL + "/v1/comment/" + this.articleID;
              var map = new Map<String, dynamic>();
              // map["articleID"] = this.articleID;
              map["massage"] = message;
              map["devicehash"] = this.deviceHash;
              print('putCommentURL: $putCommentURL');
              http.Response response =
                  await http.post(putCommentURL, body: map);
              var res = json.decode(response.body);
              print('res["Status"]: ${res["Status"]}');
              if (res["Status"] != "Ok") {
                final snackBar = SnackBar(
                  content: Text('コメントに不適切な表現が含まれていたようです\n修正してください'),
                  duration: Duration(seconds: 2),
                );

                ScaffoldMessenger.of(context).showSnackBar(snackBar);
              } else {
                print('deviceHash: ${this.deviceHash}');
                print('response.statusCode: ${response.statusCode}');
                _controller.clear();
                context
                    .read(commentProvider.notifier)
                    .getComments(this.articleID);
              }
            },
          )
        ],
      ),
    );
  }
}
