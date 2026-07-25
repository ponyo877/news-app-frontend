import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';

import type { Article } from '@/api/schemas';
import { NewsCard } from '@/components/NewsCard';
import { colors } from '@/theme/colors';
import { sizes } from '@/theme/typography';

// 関連記事の横スクロールシート(旧showBottomSheet: 高さ120、カード幅=画面幅60%)
export function RelatedArticlesSheet({ articles }: { articles: Article[] }) {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.sheet}>
      <FlatList
        data={articles}
        horizontal
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={({ item }) => (
          <View style={{ width: width * 0.6 }}>
            {/* 旧版はpublishedAtに""を渡していた(日時非表示・メニュー非表示) */}
            <NewsCard article={{ ...item, publishedAt: '' }} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    height: sizes.relatedSheetHeight,
    backgroundColor: colors.background,
  },
});
