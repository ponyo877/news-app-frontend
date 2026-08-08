import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MAX_NG_WORDS, MAX_NG_WORD_LENGTH, useNgWordStore } from '@/stores/ngWordStore';
import { colors } from '@/theme/colors';
import { fontFamily, radius } from '@/theme/typography';

// NGワード設定(競合標準機能)。登録した語をタイトルに含む記事が全タブで非表示になる
export function NgWordScreen() {
  const { ngWords, addWord, removeWord } = useNgWordStore();
  const [input, setInput] = useState('');

  const submit = () => {
    addWord(input);
    setInput('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={submit}
          placeholder="非表示にしたい単語を入力"
          placeholderTextColor={colors.textDisabled}
          maxLength={MAX_NG_WORD_LENGTH}
          returnKeyType="done"
        />
        <Pressable
          style={[styles.addButton, input.trim() === '' && styles.addButtonDisabled]}
          onPress={submit}
          disabled={input.trim() === ''}
          accessibilityRole="button"
          accessibilityLabel="NGワードを追加"
        >
          <Text style={styles.addButtonText}>追加</Text>
        </Pressable>
      </View>
      <Text style={styles.count}>
        {ngWords.length}/{MAX_NG_WORDS}件 — 登録した単語を含むタイトルの記事が非表示になります
      </Text>
      <FlatList
        data={ngWords}
        keyExtractor={(word) => word}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            NGワードはまだありません。{'\n'}見たくない話題の単語を登録すると、
            すべてのタブでその記事が表示されなくなります。
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.word}>{item}</Text>
            <Pressable
              hitSlop={8}
              onPress={() => removeWord(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item}を削除`}
            >
              <MaterialIcons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.white10,
    borderRadius: radius.actionSheet,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    fontSize: 15,
  },
  addButton: {
    backgroundColor: colors.blueGrey,
    borderRadius: radius.actionSheet,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    color: colors.textPrimary,
    fontFamily: fontFamily.medium,
    fontSize: 15,
  },
  count: {
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  word: {
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    fontSize: 15,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.textDisabled,
  },
  empty: {
    color: colors.textDisabled,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 48,
    lineHeight: 22,
  },
});
