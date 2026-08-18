import { MaterialIcons } from '@expo/vector-icons';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ArticleMenu } from '@/features/article/ArticleMenu';
import { logEvent } from '@/lib/analytics';
import { shareArticle } from '@/lib/share';
import type { RootNavigation } from '@/navigation/types';
import type { ArticleMeta } from '@/stores/articleStatusStore';
import { colors } from '@/theme/colors';

interface ArticleHeaderActionsProps {
  article: ArticleMeta;
  navigation: RootNavigation;
  commentsOpen: boolean;
  onToggleComments: () => void;
  // 関連記事が0件のときは⚡を出さない(旧版のFAB表示条件と同じ)
  hasRelated: boolean;
  relatedOpen: boolean;
  // 記事末尾まで読んだら⚡を点灯して「次のおすすめ」へ誘導する
  relatedHighlighted?: boolean;
  onToggleRelated: () => void;
  onStartTts: () => void;
}

// 記事画面ヘッダー右の操作クラスタ。
//
// 旧版・RN初期版では「コメントを開く」トグルと関連記事FABを画面最下部に浮かせていたが、
// バナー広告と隣接していたためAdMobに「ナビゲーションと誤認する配置」として
// ポリシー違反を指摘された。操作系をヘッダーに集約し、画面下部を
// タップ要素ゼロのクリアランス帯にすることで隣接関係そのものを解消する。
export function ArticleHeaderActions({
  article,
  navigation,
  commentsOpen,
  onToggleComments,
  hasRelated,
  relatedOpen,
  relatedHighlighted = false,
  onToggleRelated,
  onStartTts,
}: ArticleHeaderActionsProps) {
  return (
    <View style={styles.row}>
      {hasRelated && (
        <Pressable
          hitSlop={8}
          onPress={onToggleRelated}
          accessibilityRole="button"
          accessibilityLabel={relatedOpen ? '関連記事を閉じる' : '関連記事を見る'}
          accessibilityState={{ expanded: relatedOpen }}
        >
          <MaterialIcons
            name="bolt"
            size={26}
            color={relatedOpen || relatedHighlighted ? colors.amber : colors.textPrimary}
          />
        </Pressable>
      )}
      <Pressable
        hitSlop={8}
        onPress={onToggleComments}
        accessibilityRole="button"
        accessibilityLabel={commentsOpen ? 'コメントを閉じる' : 'コメントを開く'}
        accessibilityState={{ expanded: commentsOpen }}
      >
        <MaterialIcons
          name={commentsOpen ? 'close' : 'chat-bubble-outline'}
          size={26}
          color={colors.textPrimary}
        />
      </Pressable>
      <Pressable
        hitSlop={8}
        onPress={() => void shareArticle(article, 'header')}
        accessibilityRole="button"
        accessibilityLabel="記事を共有"
      >
        <MaterialIcons
          name={Platform.OS === 'ios' ? 'ios-share' : 'share'}
          size={24}
          color={colors.textPrimary}
        />
      </Pressable>
      {/* 本文中のリンクはすべて無効化してあるため、実際に開ける出典への導線を
          ここに置く(帰属の明示も兼ねる)。画面下部には決して置かないこと */}
      <Pressable
        hitSlop={8}
        onPress={() => {
          logEvent('source_open', { site: article.sitetitle, from: 'header' });
          void Linking.openURL(article.url);
        }}
        accessibilityRole="button"
        accessibilityLabel="元記事を開く"
      >
        <MaterialIcons name="open-in-new" size={24} color={colors.textPrimary} />
      </Pressable>
      <ArticleMenu article={article} navigation={navigation} onStartTts={onStartTts} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // 最大5アイコン(⚡💬共有↗⋮)が長い記事タイトルと共存できるよう詰める
    gap: 10,
  },
});
