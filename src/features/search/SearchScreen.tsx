import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { useSearchArticles } from '@/api/queries';
import { EmptyMessage } from '@/components/EmptyMessage';
import { ErrorState } from '@/components/ErrorState';
import { NewsCard } from '@/components/NewsCard';
import { useArticleActionSheet } from '@/features/article/useArticleActionSheet';
import { useDebouncedValue } from '@/features/search/useDebouncedValue';
import { useVisibleArticles } from '@/lib/useVisibleArticles';
import { logEvent } from '@/lib/analytics';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

// Searchタブ(旧SearchPostScreen): インクリメンタル検索(300msデバウンス追加)
export function SearchScreen() {
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebouncedValue(keyword.trim());
  const query = useSearchArticles(debouncedKeyword);
  // サイトブロック+NGワードの適用(検索はサーバフィルタが無い)
  const results = useVisibleArticles(query.data ?? []);
  const { openSheet, sheet } = useArticleActionSheet();

  useEffect(() => {
    if (debouncedKeyword !== '') {
      logEvent('search');
    }
  }, [debouncedKeyword]);

  const renderResults = () => {
    if (debouncedKeyword === '') {
      return <EmptyMessage message="キーワードで記事を検索できます" />;
    }
    if (query.isError) {
      return (
        <ErrorState
          message={'検索に失敗しました。\n通信環境をご確認ください。'}
          onRetry={() => void query.refetch()}
        />
      );
    }
    if (query.isLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      );
    }
    if (results.length === 0) {
      return <EmptyMessage message="一致する記事が見つかりませんでした" />;
    }
    return (
      <FlashList
        data={results}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={({ item }) => <NewsCard article={item} source="search" onPressMenu={openSheet} />}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrap}>
        <MaterialIcons name="search" size={24} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          value={keyword}
          onChangeText={setKeyword}
          placeholder="キーワードで検索"
          placeholderTextColor={colors.textDisabled}
          autoCorrect={false}
        />
      </View>
      <View style={styles.results}>{renderResults()}</View>
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
