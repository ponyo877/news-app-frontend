import { MaterialIcons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePostArticleReport } from '@/api/queries';
import type { PostErrorKind } from '@/api/queries';
import { ARTICLE_REPORT_REASONS } from '@/lib/articleReport';
import type { ArticleReportReason } from '@/lib/articleReport';
import type { ArticleMeta } from '@/stores/articleStatusStore';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

// 失敗時の文言(コメント投稿と同じ3分類)。ダイアログは閉じず、そのまま再送信できる
const ERROR_MESSAGES: Record<PostErrorKind, string> = {
  network: '通信に失敗しました。電波の良い場所で再度お試しください',
  server: 'サーバーが混み合っています。時間をおいて再度お試しください',
  rejected: '報告を送信できませんでした。アプリを最新版にしてお試しください',
};

interface ReportArticleDialogProps {
  article: ArticleMeta;
  onClose: () => void;
}

// 記事表示の不具合報告カード。ArticleMenu の Modal の中に描かれる(自前の Modal は持たない)。
// 理由を1つ選んで送るだけ。送信後は同じカードの中身を完了表示に差し替え、モーダルを重ねない
export function ReportArticleDialog({ article, onClose }: ReportArticleDialogProps) {
  const [reason, setReason] = useState<ArticleReportReason | null>(null);
  const report = usePostArticleReport(article);
  // 二重送信防止。isPending は次の描画まで更新されないため、同じティック内の連打は
  // refで同期的に弾く(disabled は見た目用の二重の守り)
  const submittingRef = useRef(false);

  const submit = () => {
    if (reason === null || submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    report.mutate(reason, {
      onSettled: () => {
        submittingRef.current = false;
      },
    });
  };

  if (report.isSuccess) {
    return (
      <View style={styles.dialog}>
        <Text style={styles.title}>報告を受け付けました</Text>
        <Text style={styles.note}>ご報告ありがとうございます。表示の改善に役立てます。</Text>
        <View style={styles.actions}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.actionLabel}>OK</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const errorMessage = report.isError
    ? (ERROR_MESSAGES[report.error.message as PostErrorKind] ?? ERROR_MESSAGES.rejected)
    : null;
  const canSubmit = reason !== null && !report.isPending;

  return (
    <View style={styles.dialog}>
      <Text style={styles.title}>表示の不具合を報告</Text>
      <Text style={styles.detail} numberOfLines={2}>
        {article.titles}
      </Text>
      {ARTICLE_REPORT_REASONS.map((option) => {
        const checked = reason === option.key;
        return (
          <Pressable
            key={option.key}
            style={styles.option}
            onPress={() => setReason(option.key)}
            disabled={report.isPending}
            accessibilityRole="radio"
            accessibilityState={{ checked }}
          >
            <MaterialIcons
              name={checked ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={22}
              color={checked ? colors.lightBlue : '#888888'}
            />
            <Text style={styles.optionLabel}>{option.label}</Text>
          </Pressable>
        );
      })}
      <Text style={styles.note}>
        記事のURLと端末情報(OS・アプリのバージョン)が管理者に送られます。返信はありません
      </Text>
      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      <View style={styles.actions}>
        <Pressable onPress={onClose} hitSlop={8} disabled={report.isPending}>
          <Text style={[styles.actionLabel, report.isPending && styles.actionDisabled]}>
            キャンセル
          </Text>
        </Pressable>
        <Pressable
          onPress={submit}
          hitSlop={8}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="送信"
          accessibilityState={{ disabled: !canSubmit }}
        >
          {report.isPending ? (
            <ActivityIndicator size="small" color={colors.lightBlue} />
          ) : (
            <Text style={[styles.actionLabel, !canSubmit && styles.actionDisabled]}>送信</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dialog: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
  },
  title: {
    fontSize: 16,
    fontFamily: fontFamily.bold,
    color: '#222222',
    marginBottom: 8,
  },
  detail: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: '#444444',
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: '#333333',
  },
  note: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: '#666666',
    marginTop: 12,
  },
  error: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: '#D32F2F',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 24,
    marginTop: 16,
  },
  actionLabel: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.lightBlue,
  },
  actionDisabled: {
    color: '#AAAAAA',
  },
});
