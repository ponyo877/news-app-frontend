// Flutter版 ThemeData(brightness: Brightness.dark) の実効値と、
// 旧コードにハードコードされていた全色の写し。UI同一性の基準値。
export const colors = {
  // Material dark theme 既定値
  background: '#303030', // scaffoldBackgroundColor
  surface: '#424242', // cardColor
  appBar: '#212121',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.70)',
  textDisabled: 'rgba(255, 255, 255, 0.50)',
  white10: 'rgba(255, 255, 255, 0.10)',

  // 画面ごとのハードコード色
  blueGrey: '#607D8B', // ConvexAppBar / ピルindicator / ActionSheet背景
  red200: '#EF9A9A', // カードのサイト名
  amber: '#FFC107', // 関連記事FABの稲妻アイコン
  profileAccent: '#EF476F', // Edit Name / Update Name ボタン
  lightBlue: '#03A9F4', // コメント投稿者名
  grey200: '#EEEEEE', // 相手コメントバブル
  black: '#000000',

  // コメントUI(旧 lib/screens/comment/chat_theme.dart MyTheme)
  comment: {
    primary: '#7C7B9B',
    primaryVariant: '#686795',
    accent: '#FCAAAB', // 自分のコメントバブル
    accentVariant: '#F7A3A2',
    meta: '#AEABC9', // 本文メタ・時刻
    background: '#FFFFFF',
    unreadBadge: '#EE1D1D',
  },
} as const;
