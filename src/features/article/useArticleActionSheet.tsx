import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { articleReportUrl } from '@/lib/reportForms';
import { shareArticle } from '@/lib/share';
import type { RootNavigation } from '@/navigation/types';
import { ArticleMeta, useArticleFlags, useArticleStatusStore } from '@/stores/articleStatusStore';
import { useSiteFilterStore } from '@/stores/siteFilterStore';
import { colors } from '@/theme/colors';
import { fontFamily, radius } from '@/theme/typography';

// 記事カードのmore_vertメニュー(旧newsDetail BottomSheet相当)。
// 共有 / お気に入り / サイト非表示 / 記事を報告 の4ボタン横並び。
export function useArticleActionSheet() {
  const [article, setArticle] = useState<ArticleMeta | null>(null);

  const openSheet = useCallback((target: ArticleMeta) => setArticle(target), []);
  const closeSheet = useCallback(() => setArticle(null), []);

  const sheet = useMemo(
    () =>
      article ? <ArticleActionSheet article={article} onClose={closeSheet} /> : null,
    [article, closeSheet],
  );

  return { openSheet, sheet };
}

function ArticleActionSheet({ article, onClose }: { article: ArticleMeta; onClose: () => void }) {
  const navigation = useNavigation<RootNavigation>();
  const queryClient = useQueryClient();
  const { favoriteFlg } = useArticleFlags(article.id);
  const toggleFavorite = useArticleStatusStore((s) => s.toggleFavorite);
  const blockSite = useSiteFilterStore((s) => s.blockSite);

  const actions = [
    {
      key: 'share',
      icon: 'share' as const,
      iconColor: colors.black,
      label: '共有',
      onPress: () => {
        // 閉じてから共有(iOSのモーダル競合回避。ArticleMenuと同パターン)
        onClose();
        void shareArticle(article, 'list_sheet');
      },
    },
    {
      key: 'favorite',
      icon: favoriteFlg ? ('favorite' as const) : ('favorite-border' as const),
      iconColor: favoriteFlg ? '#F44336' : colors.black,
      label: 'お気に入り',
      onPress: () => toggleFavorite(article),
    },
    {
      key: 'block',
      icon: 'block' as const,
      iconColor: colors.black,
      label: 'サイト非表示',
      onPress: () => {
        blockSite(article.siteID);
        // 旧版のgetPost(true)相当: ブロック反映のため新着を再取得
        void queryClient.invalidateQueries({ queryKey: ['articles', 'latest'] });
      },
    },
    {
      key: 'report',
      icon: 'report' as const,
      iconColor: colors.black,
      label: '記事を報告',
      onPress: () => {
        onClose();
        navigation.navigate('NormalWebView', {
          title: '記事の報告',
          url: articleReportUrl(article.titles, article.url),
        });
      },
    },
  ];

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        {actions.map((action) => (
          <Pressable key={action.key} style={styles.action} onPress={action.onPress}>
            <View style={styles.circle}>
              <MaterialIcons name={action.icon} size={28} color={action.iconColor} />
            </View>
            <Text style={styles.label}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    backgroundColor: colors.blueGrey,
    borderTopLeftRadius: radius.actionSheet,
    borderTopRightRadius: radius.actionSheet,
    paddingVertical: 32,
  },
  action: {
    alignItems: 'center',
    // 4ボタンでも小型端末(375pt)に収まるようflex化
    flex: 1,
    maxWidth: 110,
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 10,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    fontSize: 13,
  },
});
