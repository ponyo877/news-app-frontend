import 'package:flutter/material.dart';
import 'comment/conversation.dart';
import 'comment/chat_composer.dart';
import 'comment/chat_theme.dart';
class CommentScreen extends StatefulWidget {
  const CommentScreen({Key? key, required this.articleID, required this.deviceHash}) : super(key: key);

  @override
  _CommentScreen createState() => _CommentScreen();
  final String articleID;
  final String deviceHash;
}

// https://github.com/cybdom/messengerish
// https://github.com/itzpradip/flutter-chat-app
// https://github.com/tonydavidx/chattie-ui-design
class _CommentScreen extends State<CommentScreen> {
  @override
  Widget build(BuildContext context) {
    return Expanded(
            child: GestureDetector(
              onTap: () {
                // コメントを打つためのTextFieldをコメント画面をタップすると縮小する
                // Old Ver: FocusScope.of(context).unfocus();
                final FocusScopeNode currentScope = FocusScope.of(context);
                if (!currentScope.hasPrimaryFocus && currentScope.hasFocus) {
                  FocusManager.instance.primaryFocus?.unfocus();
                }
              },
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Expanded(
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: 20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.only(
                          topLeft: Radius.circular(30),
                          topRight: Radius.circular(30),
                        ),
                      ),
                      // 画像などのコンテンツの角を丸くする
                      child: ClipRRect(
                        borderRadius: BorderRadius.only(
                          topLeft: Radius.circular(30),
                          topRight: Radius.circular(30),
                        ),
                        // コメントの一覧
                        child:
                            Conversation(articleID: widget.articleID,
                                deviceHash: widget.deviceHash),
                      ),
                    ),
                  ),
                  // コメント記入フォーム
                  buildChatComposer(
                      articleID: widget.articleID,
                      deviceHash: widget.deviceHash),
                ],
              ),
            ),
          );
  }
}
