import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { articleReportUrl } from '@/lib/reportForms';
import type { RootNavigation } from '@/navigation/types';
import type { ArticleMeta } from '@/stores/articleStatusStore';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

// 記事画面ヘッダー右のメニュー(旧PopupMenuButton: Share / Report article problem)
export function ArticleMenu({
  article,
  navigation,
}: {
  article: ArticleMeta;
  navigation: RootNavigation;
}) {
  const [open, setOpen] = useState(false);

  const share = async () => {
    setOpen(false);
    // 旧FlutterShare: title + "title: X" + "URL: Y" と同内容
    await Share.share({
      title: article.titles,
      message: `title: ${article.titles}\nURL: ${article.url}`,
    });
  };

  const report = () => {
    setOpen(false);
    navigation.navigate('NormalWebView', {
      title: 'Report article problem',
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
            <Pressable style={styles.item} onPress={share}>
              <MaterialIcons name="share" size={20} color={colors.textPrimary} />
              <Text style={styles.label}>Share</Text>
            </Pressable>
            <Pressable style={styles.item} onPress={report}>
              <MaterialIcons name="report" size={20} color={colors.textPrimary} />
              <Text style={styles.label}>Report article problem</Text>
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
