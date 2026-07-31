import { useHeaderHeight } from '@react-navigation/elements';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { incrementView } from '@/api/endpoints';
import { useSimilarArticles } from '@/api/queries';
import { ArticleHeaderActions } from '@/features/article/ArticleHeaderActions';
import { RelatedArticlesSheet } from '@/features/article/RelatedArticlesSheet';
import { useArticleHtml } from '@/features/article/useArticleHtml';
import { CommentPanel } from '@/features/comments/CommentPanel';
import { bannerAdUnitId } from '@/lib/ads';
import type { RootStackParamList } from '@/navigation/types';
import { useArticleStatusStore } from '@/stores/articleStatusStore';
import { colors } from '@/theme/colors';
import { fontFamily, radius } from '@/theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Article'>;

// 記事詳細画面(旧MatomeWebView)。
// 整形済みHTMLをWebViewで表示し、コメント欄を100%:0⇔50%:50で切り替える。
//
// 【AdMobポリシー対応】最下部のバナー広告に隣接するタップ要素を作らないこと。
// 旧版はここに「コメントを開く」トグルと関連記事FABを浮かせていたため
// 「ナビゲーションと誤認する配置」として違反を指摘された。操作系はすべて
// ヘッダー(ArticleHeaderActions)に集約し、広告の上はクリアランス帯として空ける。
export function ArticleScreen({ route, navigation }: Props) {
  const { article } = route.params;
  const markRead = useArticleStatusStore((s) => s.markRead);
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRelatedOpen, setIsRelatedOpen] = useState(false);

  const htmlQuery = useArticleHtml(article.url, article.sitetitle);
  const similarQuery = useSimilarArticles(article.id);
  const related = similarQuery.data ?? [];

  useEffect(() => {
    // 既読化+履歴追加+閲覧数はマウント時に1回(履歴カード経由でも同一挙動)
    markRead(article);
    incrementView(article.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <ArticleHeaderActions
          article={article}
          navigation={navigation}
          commentsOpen={!isExpanded}
          onToggleComments={() => setIsExpanded((expanded) => !expanded)}
          hasRelated={related.length > 0}
          relatedOpen={isRelatedOpen}
          onToggleRelated={() => setIsRelatedOpen((open) => !open)}
        />
      ),
    });
  }, [navigation, article, isExpanded, related.length, isRelatedOpen]);

  if (htmlQuery.isLoading || htmlQuery.data === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size={32} color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <View style={styles.articleArea}>
        <View style={styles.webViewClip}>
          <WebView
            source={{ html: htmlQuery.data, baseUrl: article.url }}
            javaScriptEnabled
            // hrefは剥奪済みだが、万一のページ遷移を遮断する保険
            onShouldStartLoadWithRequest={(req) =>
              req.url === article.url || req.url === 'about:blank'
            }
          />
          {/* コメント表示中は記事側タップで100%に復帰(旧GestureDetector相当) */}
          {!isExpanded && (
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsExpanded(true)} />
          )}
        </View>
        {/* 関連記事はヘッダー直下から降りる。広告から最も遠い位置に置くため上寄せにした */}
        {isRelatedOpen && (
          <View style={styles.relatedSheet}>
            <RelatedArticlesSheet articles={related} />
          </View>
        )}
      </View>
      {!isExpanded && (
        // コメント表示中は入力欄の送信ボタンが広告の真上に来るため、ここで間隔を稼ぐ。
        // 記事のみ表示のときは不要なので、広告ブロック側は詰めたままにできる
        <View style={[styles.commentArea, styles.commentAreaClearance]}>
          <CommentPanel articleId={article.id} />
        </View>
      )}
      {/* 広告ブロック: 記事の表示面積を最大化するためバナー高さぴったりに詰める。
          アプリUIとの区別は区切り線・背景色・左端の「広告」ラベルで担保し、
          下端はセーフエリアを空けてジェスチャー領域と重ならないようにする */}
      <View style={[styles.adBlock, { paddingBottom: insets.bottom }]}>
        <View style={styles.adRow}>
          {/* バナーは320pt幅。画面幅との差が左右に余るので、そこにラベルを収めて
              縦方向の高さを増やさない */}
          <Text style={styles.adLabel}>広告</Text>
          <BannerAd unitId={bannerAdUnitId} size={BannerAdSize.BANNER} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  articleArea: {
    flex: 1,
  },
  webViewClip: {
    flex: 1,
    borderRadius: radius.articleWebView,
    overflow: 'hidden',
  },
  relatedSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  commentArea: {
    flex: 1,
  },
  commentAreaClearance: {
    // 送信ボタンと広告バナーの間隔。AdMobポリシー対応のため詰めないこと
    paddingBottom: 16,
  },
  adBlock: {
    backgroundColor: colors.appBar,
    borderTopWidth: 1,
    borderTopColor: colors.white10,
    // バナー(高さ50)にぴったり合わせ、記事の表示面積を最大化する。
    // 記事のみ表示のときは上がWebViewでタップ要素がないため詰めてよい
    paddingVertical: 0,
  },
  adRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adLabel: {
    // バナー左の余白に重ねて置き、広告ブロックの高さを増やさない
    position: 'absolute',
    left: 8,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: fontFamily.regular,
    color: colors.textDisabled,
  },
});
