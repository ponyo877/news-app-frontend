import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Thumbnail } from '@/components/Thumbnail';
import type { ArticleOpenFrom, RootNavigation } from '@/navigation/types';
import { ArticleMeta, useArticleFlags } from '@/stores/articleStatusStore';
import { colors } from '@/theme/colors';
import { fontFamily, fontSize } from '@/theme/typography';
import { formatDateTime } from '@/lib/format';

interface NewsCardProps {
  article: ArticleMeta;
  // ランキングでは順位数字に差し替える(旧NewsRankingCardのthumbnailオーバーライド相当)
  leading?: ReactNode;
  // 既読/お気に入り表現を持たない履歴カード(旧NewsHistoryCard相当)
  plain?: boolean;
  // article_openの導線内訳(どのリストから開かれたか)。全リストがNewsCard経由のためここが唯一の伝搬点
  source?: ArticleOpenFrom;
  // 祭りバッジ(この記事を含むクラスタのサイト数。0/undefinedなら非表示)
  matsuriCount?: number;
  onPressMenu?: (article: ArticleMeta, favoriteFlg: boolean) => void;
}

export function NewsCard({
  article,
  leading,
  plain = false,
  source,
  matsuriCount,
  onPressMenu,
}: NewsCardProps) {
  const navigation = useNavigation<RootNavigation>();
  const flags = useArticleFlags(article.id);
  const readFlg = !plain && flags.readFlg;

  const titleColor = readFlg ? colors.textDisabled : colors.textPrimary;
  const siteColor = readFlg ? colors.textDisabled : colors.red200;
  const showMenu = article.publishedAt !== '' && onPressMenu !== undefined;

  return (
    <Pressable
      style={styles.card}
      onPress={() => navigation.navigate('Article', { article, from: source })}
      android_ripple={{ color: colors.white10 }}
    >
      <View style={styles.leading}>{leading ?? <Thumbnail uri={article.image} />}</View>
      <View style={styles.body}>
        {matsuriCount !== undefined && matsuriCount >= 2 && (
          <Text style={styles.matsuriBadge}>🔥 {matsuriCount}サイトがまとめ中</Text>
        )}
        <Text
          style={[styles.title, { color: titleColor }, readFlg && styles.titleRead]}
          numberOfLines={3}
        >
          {article.titles}
        </Text>
        <View style={styles.subtitleRow}>
          <Text style={styles.date} numberOfLines={1}>
            {formatDateTime(article.publishedAt)}
          </Text>
          <Text style={[styles.site, { color: siteColor }]} numberOfLines={1}>
            {article.sitetitle}
          </Text>
        </View>
      </View>
      {showMenu && (
        <Pressable
          style={styles.menuButton}
          hitSlop={8}
          onPress={() => onPressMenu(article, flags.favoriteFlg)}
        >
          <MaterialIcons name="more-vert" size={24} color={colors.textPrimary} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  matsuriBadge: {
    color: colors.amber,
    fontFamily: fontFamily.medium,
    fontSize: 11,
    marginBottom: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 4,
    marginHorizontal: 4,
    marginVertical: 4,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 8,
  },
  leading: {
    marginRight: 16,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.cardTitle,
    fontFamily: fontFamily.medium,
    lineHeight: 20,
  },
  titleRead: {
    fontFamily: fontFamily.regular,
  },
  subtitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  date: {
    fontSize: fontSize.cardMeta,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
  },
  site: {
    fontSize: fontSize.cardMeta,
    fontFamily: fontFamily.regular,
    marginLeft: 8,
  },
  menuButton: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
});
