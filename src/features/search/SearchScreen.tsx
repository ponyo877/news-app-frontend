import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { useSearchArticles } from '@/api/queries';
import { NewsCard } from '@/components/NewsCard';
import { useArticleActionSheet } from '@/features/article/useArticleActionSheet';
import { useDebouncedValue } from '@/features/search/useDebouncedValue';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

// Searchタブ(旧SearchPostScreen): インクリメンタル検索(300msデバウンス追加)
export function SearchScreen() {
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebouncedValue(keyword.trim());
  const query = useSearchArticles(debouncedKeyword);
  const { openSheet, sheet } = useArticleActionSheet();

  return (
    <View style={styles.container}>
      <View style={styles.inputWrap}>
        <MaterialIcons name="search" size={24} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          value={keyword}
          onChangeText={setKeyword}
          placeholderTextColor={colors.textDisabled}
          autoCorrect={false}
        />
      </View>
      <View style={styles.results}>
        {query.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.textPrimary} />
          </View>
        ) : (
          <FlashList
            data={query.data ?? []}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={({ item }) => <NewsCard article={item} onPressMenu={openSheet} />}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
      {sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 30,
    marginRight: 30,
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: fontFamily.regular,
  },
  results: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
