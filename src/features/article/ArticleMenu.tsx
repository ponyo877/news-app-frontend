import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { logEvent } from '@/lib/analytics';
import { articleReportUrl } from '@/lib/reportForms';
import type { RootNavigation } from '@/navigation/types';
import type { ArticleMeta } from '@/stores/articleStatusStore';
import { FONT_SCALES, useFontSizeStore } from '@/stores/fontSizeStore';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

// 記事画面ヘッダー右のメニュー。
// 共有は1タップ化のためヘッダー直下のアイコンへ移設済み(share.ts)。
// 文字サイズはここに置く: ヘッダーのアイコン過密を避けつつ、backdropが
// 透明なのでピルをタップすると背後のWebViewで即時プレビューできる
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
  const scale = useFontSizeStore((s) => s.scale);
  const setScale = useFontSizeStore((s) => s.setScale);

  const startTts = () => {
    setOpen(false);
    onStartTts();
  };

  const report = () => {
    setOpen(false);
    navigation.navigate('NormalWebView', {
      title: '記事の問題を報告',
      url: articleReportUrl(article.titles, article.url),
    });
  };

  return (
    <>
      <Pressable hitSlop={8} onPress={() => setOpen(true)}>
        <MaterialIcons name="more-vert" size={24} color={colors.textPrimary} />
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
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
            <Pressable style={styles.item} onPress={report}>
              <MaterialIcons name="report" size={20} color={colors.textPrimary} />
              <Text style={styles.label}>記事の問題を報告</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    top: 48,
    right: 8,
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
