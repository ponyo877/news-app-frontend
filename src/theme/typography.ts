// フォントは旧版と同じ M PLUS Rounded 1c(旧版は宣言のみでフォールバックしていたが、
// RN版では実際にバンドルして質感を統一する)
export const fontFamily = {
  regular: 'MPLUSRounded1c_400Regular',
  medium: 'MPLUSRounded1c_500Medium',
  bold: 'MPLUSRounded1c_700Bold',
} as const;

// 旧コードの全fontSizeの写し
export const fontSize = {
  cardTitle: 15,
  cardMeta: 12.5,
  sectionLabel: 18,
  tabLabel: 20,
  rankNumber: 30,
  commentHeader: 10,
  commentTime: 11,
  commentBody: 13,
  commentName: 14,
} as const;

// 旧コードの角丸・寸法の写し
export const radius = {
  commentSheet: 30, // コメント欄上部
  articleWebView: 20,
  actionSheet: 15, // 記事メニューBottomSheet上部
  thumbnail: 10,
  pill: 50, // タブindicator
  profileButton: 20,
} as const;

export const sizes = {
  thumbnail: 60,
  siteIcon: 50,
  adBannerHeight: 50,
  composerHeight: 60,
  composerInputHeight: 40,
  relatedSheetHeight: 120,
  profileCardHeight: 210,
} as const;
