import { FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { Article } from '@/api/schemas';
import { NewsCard } from '@/components/NewsCard';
import { colors } from '@/theme/colors';
import { fontFamily, sizes } from '@/theme/typography';

// おすすめ記事の横スクロールシート(記事末尾到達時に自動表示 or ヘッダー⚡から)。
// 中身はCloudflare推薦基盤の「人×今読んでいる記事」(api/recs.ts)
export function RelatedArticlesSheet({ articles }: { articles: Article[] }) {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.sheet}>
      <Text style={styles.heading}>この記事を読んだあなたへ</Text>
      <FlatList
        data={articles}
        horizontal
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={({ item }) => (
          <View style={{ width: width * 0.6 }}>
            {/* 旧版はpublishedAtに""を渡していた(日時非表示・メニュー非表示) */}
            <NewsCard article={{ ...item, publishedAt: '' }} source="similar" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    height: sizes.relatedSheetHeight + 28,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.white10,
  },
  heading: {
    color: colors.amber,
    fontFamily: fontFamily.medium,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 2,
  },
});
