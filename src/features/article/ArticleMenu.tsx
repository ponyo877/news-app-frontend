import { MaterialIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ReportArticleDialog } from '@/features/article/ReportArticleDialog';
import { logEvent } from '@/lib/analytics';
import type { RootNavigation } from '@/navigation/types';
import type { ArticleMeta } from '@/stores/articleStatusStore';
import { FONT_SCALES, useFontSizeStore } from '@/stores/fontSizeStore';
import { useSiteFilterStore } from '@/stores/siteFilterStore';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

// 記事画面ヘッダー右のメニュー。
// 共有は1タップ化のためヘッダー直下のアイコンへ移設済み(share.ts)。
// 文字サイズはここに置く: ヘッダーのアイコン過密を避けつつ、backdropが
// 透明なのでピルをタップすると背後のWebViewで即時プレビューできる。
//
// 「このサイトを非表示」もここに置く。一覧カードのシート
// (useArticleActionSheet)には元からあったが、記事を読んでいる最中に
// 「このサイトはもういい」と判断する導線が無かった。競合アプリのレビューで
// 「記事を見て非表示にしたいサイトを見つけた場合、サイト一覧タブに移動して
// サイト名を探すのが苦行」という指摘が実際に出ている(docs/COMPETITORS.md)。
//
// 「表示の不具合を報告」はGoogleフォーム遷移からサーバ蓄積に置き換えた(2026-08-25)。
// 1.51で埋め込みが消えていた問題は、記事URLがユーザーから届かず実態把握に数百記事の
// 自前取得が要った(docs/REMAINING_TASKS.md の訂正)。理由を選ぶだけでURLとIDが届くようにする。
// 報告カードはこのメニューと同じ1つのModalの中身を切り替えて出す: メニューのModalを閉じながら
// 別のModalを開くと、iOSはdismissアニメーション中のpresentを黙って失敗させることがある
export function ArticleMenu({
  article,
  navigation,
  onStartTts,
}: {
  article: ArticleMeta;
  navigation: RootNavigation;
  onStartTts: () => void;
}) {
  const [open, setOpen] = useState(false);
  // Modalの中身: メニュー項目 or 不具合報告カード
  const [mode, setMode] = useState<'menu' | 'report'>('menu');
  const scale = useFontSizeStore((s) => s.scale);
  const setScale = useFontSizeStore((s) => s.setScale);
  const blockSite = useSiteFilterStore((s) => s.blockSite);
  const queryClient = useQueryClient();

  // 閉じるときは中身を戻さない(フェードアウト中に報告カードがメニューへ化けるのを避ける)。
  // 次に開くときにメニューへ戻す
  const openMenu = () => {
    setMode('menu');
    setOpen(true);
  };
  const close = () => setOpen(false);

  const startTts = () => {
    setOpen(false);
    onStartTts();
  };

  // 一覧カードのシートと違い、こちらは確認を挟む。
  // 読んでいる記事のサイトを消す=いま見ている画面から戻される操作なので、
  // 誤タップの取り返しがつかない。戻し方(設定の「表示サイトの選択」)も
  // その場で伝える。競合レビューでは「誤って触れやすい」ボタンへの不満が多い
  const hideSite = () => {
    setOpen(false);
    Alert.alert(
      `${article.sitetitle}を非表示にしますか?`,
      'このサイトの記事は一覧に出なくなります。設定の「表示サイトの選択」でいつでも元に戻せます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '非表示にする',
          style: 'destructive',
          onPress: () => {
            blockSite(article.siteID);
            // 一覧カードのシートと同じく、ブロックを反映するため新着を取り直す
            void queryClient.invalidateQueries({ queryKey: ['articles', 'latest'] });
            // 非表示にしたサイトの記事を開いたままにしない
            navigation.goBack();
          },
        },
      ],
    );
  };

  const report = () => setMode('report');

  return (
    <>
      <Pressable
        hitSlop={8}
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel="メニュー"
      >
        <MaterialIcons name="more-vert" size={24} color={colors.textPrimary} />
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={close}>
        {mode === 'report' ? (
          // backdropタップでは閉じない(送信中の誤操作防止)。閉じるのはカードのボタンか戻るキー
          <View style={styles.dialogBackdrop}>
            <ReportArticleDialog article={article} onClose={close} />
          </View>
        ) : (
          <Pressable style={styles.backdrop} onPress={close}>
            <View style={styles.menu}>
              <View style={styles.fontRow}>
                <Text style={styles.fontRowLabel}>文字サイズ</Text>
                <View style={styles.pills}>
                  {FONT_SCALES.map((option) => (
                    <Pressable
                      key={option.key}
                      style={[styles.pill, scale === option.key && styles.pillActive]}
                      onPress={() => {
                        // メニューは閉じない(背後のWebViewで変更が即プレビューされる)
                        setScale(option.key);
                        logEvent('font_scale', { scale: option.key });
                      }}
                    >
                      <Text
                        style={[styles.pillText, scale === option.key && styles.pillTextActive]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.divider} />
              <Pressable style={styles.item} onPress={startTts}>
                <MaterialIcons name="headset" size={20} color={colors.textPrimary} />
                <Text style={styles.label}>読み上げ</Text>
              </Pressable>
              <View style={styles.divider} />
              <Pressable style={styles.item} onPress={hideSite}>
                <MaterialIcons name="block" size={20} color={colors.textPrimary} />
                <Text style={styles.label} numberOfLines={1}>
                  {article.sitetitle}を非表示
                </Text>
              </Pressable>
              <View style={styles.divider} />
              <Pressable style={styles.item} onPress={report}>
                <MaterialIcons name="report" size={20} color={colors.textPrimary} />
                <Text style={styles.label}>表示の不具合を報告</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  // 報告カード用。メニューと違い背後のWebViewを見せる必要がないので暗くして注意を集める
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  menu: {
    position: 'absolute',
    top: 48,
    right: 8,
    // サイト名を項目に出すため、長い名前でも画面外へ広がらないよう上限を置く
    maxWidth: 280,
    backgroundColor: colors.surface,
    borderRadius: 4,
    paddingVertical: 8,
    elevation: 8,
    shadowColor: colors.black,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fontRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  fontRowLabel: {
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    marginBottom: 8,
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.white10,
  },
  pillActive: {
    backgroundColor: colors.blueGrey,
  },
  pillText: {
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
    fontSize: 13,
  },
  pillTextActive: {
    color: colors.textPrimary,
    fontFamily: fontFamily.medium,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.textDisabled,
    marginVertical: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    fontSize: 15,
  },
});
