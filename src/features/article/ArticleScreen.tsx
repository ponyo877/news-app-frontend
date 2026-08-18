import { useHeaderHeight } from '@react-navigation/elements';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
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
import { useRelatedArticles } from '@/api/queries';
import { ErrorState } from '@/components/ErrorState';
import { ArticleHeaderActions } from '@/features/article/ArticleHeaderActions';
import { fontScaleScript } from '@/features/article/fontScale';
import { RelatedArticlesSheet } from '@/features/article/RelatedArticlesSheet';
import { TtsPlayerBar } from '@/features/article/TtsPlayerBar';
import { useTtsPlayer } from '@/features/article/useTtsPlayer';
import { useArticleHtml } from '@/features/article/useArticleHtml';
import { useVisibleArticles } from '@/lib/useVisibleArticles';
import { ttsClearScript, ttsFollowScript } from '@/features/article/ttsFollow';
import { articleUnavailableReason } from '@/scraper/errors';
import type { ArticleUnavailableReason } from '@/scraper/errors';
import { SOURCE_LINK_URL } from '@/scraper/serialize';
import { buildTtsScriptWithAnchors } from '@/scraper/ttsScript';
import type { TtsSegment } from '@/scraper/ttsScript';
import { CommentPanel } from '@/features/comments/CommentPanel';
import { bannerAdUnitId } from '@/lib/ads';
import { logEvent } from '@/lib/analytics';
import type { RootStackParamList } from '@/navigation/types';
import { useArticleStatusStore } from '@/stores/articleStatusStore';
import type { ArticleMeta } from '@/stores/articleStatusStore';
import { percentOf, useFontSizeStore } from '@/stores/fontSizeStore';
import { colors } from '@/theme/colors';
import { fontFamily, radius } from '@/theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Article'>;

// HTML未取得時に使う不変の空配列。毎回新しい配列を作るとuseTtsPlayerの
// useCallback依存が変わり、再生中のクロージャが作り直されてしまう
const EMPTY_SEGMENTS: TtsSegment[] = [];

// WebView内の遷移可否。出典リンクだけは外部ブラウザへ逃がす。
// WebView内で開くと元サイトを広告ごと表示することになり、整形の意味も失われる。
// 本文中のhrefは剥奪済みだが、それ以外の遷移は保険として遮断する
function makeLoadRequestHandler(article: ArticleMeta) {
  return (req: { url: string }): boolean => {
    if (req.url === SOURCE_LINK_URL) {
      logEvent('source_open', { site: article.sitetitle, from: 'footer' });
      void Linking.openURL(article.url);
      return false;
    }
    return req.url === article.url || req.url === 'about:blank';
  };
}

// 本文を出せない理由の説明。まとめサイトの記事は日常的に削除されるが
// 一覧(RSS由来)には残るため、削除は通信エラーと区別して伝える
function unavailableMessage(reason: ArticleUnavailableReason | undefined): string {
  if (reason === 'gone') {
    return '元記事が削除されたか、\n移動したようです。';
  }
  if (reason === 'unsupported') {
    return 'この記事はまだ表示に\n対応していません。';
  }
  return '記事を読み込めませんでした。\nサイトが混み合っているか、\n通信環境に問題がある可能性があります。';
}

// 【AdMobポリシー対応】本文の無い画面はすべてここに来る。
// ErrorStateは広告バナーを含まないため、中央の再読み込みボタンは隣接制約に抵触しない。
// 削除済み・非対応の記事も(旧実装のように案内文HTMLを本文として表示するのではなく)
// 必ずこの画面に落とすこと
function ArticleUnavailable({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const reason = articleUnavailableReason(error);
  return (
    <ErrorState
      message={unavailableMessage(reason)}
      // 削除済み・非対応は再試行しても結果が変わらないため再読み込みを出さない
      onRetry={reason === undefined ? onRetry : undefined}
    />
  );
}

// 記事詳細画面(旧MatomeWebView)。
// 整形済みHTMLをWebViewで表示し、コメント欄を100%:0⇔50%:50で切り替える。
//
// 【AdMobポリシー対応】最下部のバナー広告に隣接するタップ要素を作らないこと。
// 旧版はここに「コメントを開く」トグルと関連記事FABを浮かせていたため
// 「ナビゲーションと誤認する配置」として違反を指摘された。操作系はすべて
// ヘッダー(ArticleHeaderActions)に集約し、広告の上はクリアランス帯として空ける。
export function ArticleScreen({ route, navigation }: Props) {
  const { article, from } = route.params;
  const markRead = useArticleStatusStore((s) => s.markRead);
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRelatedOpen, setIsRelatedOpen] = useState(false);
  // 記事末尾まで読んだら「この記事を読んだあなたへ」シートを自動表示する
  // (シートはヘッダー直下から降りるためAdMob下部制約に抵触しない)
  const [reachedEnd, setReachedEnd] = useState(false);
  const autoOpenedRef = useRef(false);
  const webViewRef = useRef<WebView>(null);
  const fontPercent = percentOf(useFontSizeStore((s) => s.scale));

  const htmlQuery = useArticleHtml(article.url, article.sitetitle);
  const handleLoadRequest = useMemo(() => makeLoadRequestHandler(article), [article]);
  // 読み上げ(文字色で読み手が変わる)。セグメント生成はHTML確定時に1回。
  // 同時に各セグメントの起点へアンカーを打ったHTMLも作り、読み上げ中はそちらを表示する
  const [isTtsOpen, setIsTtsOpen] = useState(false);
  // バナーが実際に埋まったか。未配信のとき広告の帯とラベルだけが残るのを防ぐ
  const [isAdFilled, setIsAdFilled] = useState(false);
  const ttsScript = useMemo(
    () => (htmlQuery.data ? buildTtsScriptWithAnchors(htmlQuery.data) : null),
    [htmlQuery.data],
  );
  const ttsSegments = ttsScript?.segments ?? EMPTY_SEGMENTS;
  const tts = useTtsPlayer(ttsSegments, article.sitetitle);
  // 追従由来のスクロールを手動操作と誤検知しないための目印。
  // どちらも描画に影響しないためstateではなくrefで持つ
  const autoScrollingRef = useRef(false);
  const followsTtsRef = useRef(true);
  // 一度でも読み上げを開いたか(閉じたときのハイライト解除を初回マウントで走らせない)
  const openedTtsRef = useRef(false);
  // 人×今読んでいる記事の推薦(Cloudflare)。旧similar(BERT・封印中)の後継
  const relatedQuery = useRelatedArticles(article.id);
  const related = useVisibleArticles(relatedQuery.data ?? []);

  useEffect(() => {
    // 既読化+履歴追加+閲覧数はマウント時に1回(履歴カード経由でも同一挙動)
    markRead(article);
    incrementView(article.id);
    // 中核イベント: どのサイトの記事がどれだけ読まれているか
    logEvent('article_open', {
      site: article.sitetitle,
      article_id: article.id,
      from: from ?? 'unknown',
    });
    const openedAt = Date.now();
    return () => {
      // 滞在秒数つきの読了イベント(離脱の質を見る)
      logEvent('article_read_done', {
        site: article.sitetitle,
        seconds: Math.round((Date.now() - openedAt) / 1000),
        from: from ?? 'unknown',
      });
    };
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
          relatedHighlighted={reachedEnd}
          onToggleRelated={() => setIsRelatedOpen((open) => !open)}
          onStartTts={() => {
            // 関連シートと排他(どちらもヘッダー直下の同じレイヤーに出るため)
            setIsRelatedOpen(false);
            setIsTtsOpen(true);
          }}
        />
      ),
    });
  }, [navigation, article, isExpanded, related.length, isRelatedOpen, reachedEnd]);

  useEffect(() => {
    // iOSは表示中のWebViewへ注入で反映(Androidはprop textZoomの変更で再描画される)
    if (Platform.OS === 'ios') {
      webViewRef.current?.injectJavaScript(fontScaleScript(fontPercent));
    }
  }, [fontPercent]);

  useEffect(() => {
    // 記事を最後まで読んだら1回だけ自動でおすすめを開く(閉じたら再表示しない)
    if (reachedEnd && related.length > 0 && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setIsRelatedOpen(true);
    }
  }, [reachedEnd, related.length]);

  useEffect(() => {
    // メニューで「読み上げ」を選んだら即再生する(バーを出すだけだと「選んだのに
    // 始まらない」体験になる)。HTML取得前に開かれてもセグメント確定時にここで拾う。
    // idle限定なので一時停止中や再生中に巻き戻ることはない
    if (isTtsOpen && ttsSegments.length > 0 && tts.status === 'idle') {
      tts.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTtsOpen, ttsSegments.length]);

  useEffect(() => {
    // 読み上げ位置へスクロールしてハイライトを移す。
    // 手動スクロール中は追わないが、次のセグメントに進んだ時点で復帰させる
    if (!isTtsOpen || tts.status !== 'playing') {
      return;
    }
    if (!followsTtsRef.current) {
      // 手動スクロール後の最初のセグメント送りは追わず、次から復帰する
      followsTtsRef.current = true;
      return;
    }
    autoScrollingRef.current = true;
    webViewRef.current?.injectJavaScript(ttsFollowScript(tts.segmentIndex));
    // smoothスクロールが落ち着くまでonScrollを手動操作と見なさない
    const timer = setTimeout(() => {
      autoScrollingRef.current = false;
    }, 900);
    return () => clearTimeout(timer);
  }, [tts.segmentIndex, isTtsOpen, tts.status]);

  useEffect(() => {
    // 読み上げを閉じたらハイライトを消す。HTMLは差し替えないので、
    // 解除しないと最後に読んだ箇所が塗られたまま残る。
    // 初回マウント時は読み込み前のWebViewに注入しても無駄なので開いた後だけ動かす
    if (isTtsOpen) {
      openedTtsRef.current = true;
      return;
    }
    if (openedTtsRef.current) {
      webViewRef.current?.injectJavaScript(ttsClearScript());
      followsTtsRef.current = true;
    }
  }, [isTtsOpen]);

  // 取得失敗(タイムアウト・削除済み・非対応)。旧実装は data===undefined のまま無限スピナーだった
  if (htmlQuery.isError) {
    return <ArticleUnavailable error={htmlQuery.error} onRetry={() => void htmlQuery.refetch()} />;
  }

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
            ref={webViewRef}
            // 読み上げの開閉に関わらずアンカー付きHTMLを表示する。
            // sourceを差し替えるとWebViewが再読み込みされ、読んでいた位置を
            // 失うため。アンカーは属性とspanだけなので見た目は変わらない
            source={{
              html: ttsScript?.html ?? htmlQuery.data,
              baseUrl: article.url,
            }}
            javaScriptEnabled
            // 文字サイズ: Androidはネイティブのズーム、iOSは初期注入+変更時injectJavaScript
            textZoom={fontPercent}
            injectedJavaScript={Platform.OS === 'ios' ? fontScaleScript(fontPercent) : undefined}
            onScroll={({ nativeEvent }) => {
              const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
              if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 32) {
                setReachedEnd((was) => {
                  if (!was) {
                    logEvent('read_end_reached', { site: article.sitetitle });
                  }
                  return true;
                });
              }
              // 追従由来でないスクロール=手動操作。読み返しを邪魔しないよう追従を止める
              if (isTtsOpen && !autoScrollingRef.current) {
                followsTtsRef.current = false;
              }
            }}
            onShouldStartLoadWithRequest={handleLoadRequest}
          />
          {/* コメント表示中は記事側タップで100%に復帰(旧GestureDetector相当) */}
          {!isExpanded && (
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsExpanded(true)} />
          )}
        </View>
        {/* 関連記事はヘッダー直下から降りる。広告から最も遠い位置に置くため上寄せにした */}
        {isRelatedOpen && !isTtsOpen && (
          <View style={styles.relatedSheet}>
            <RelatedArticlesSheet articles={related} />
          </View>
        )}
        {isTtsOpen && (
          <View style={styles.relatedSheet}>
            <TtsPlayerBar
              status={tts.status}
              segmentIndex={tts.segmentIndex}
              total={tts.total}
              rate={tts.rate}
              onToggle={() => (tts.status === 'playing' ? tts.pause() : tts.play())}
              onCycleRate={tts.cycleRate}
              onClose={() => {
                tts.stop();
                setIsTtsOpen(false);
              }}
            />
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
      {/* 広告ブロック: アプリUIとの区別を区切り線・背景色・「広告」ラベルで担保し、
          上下にクリアランスを取ってコンテンツともジェスチャー領域とも接しないようにする。
          配信が無いあいだ(アカウント停止・在庫切れ・オフライン)は帯とラベルを出さず、
          セーフエリアの余白だけ残す。BannerAdはマウントしたままなのでリクエストは続く */}
      <View style={[isAdFilled && styles.adBlock, { paddingBottom: insets.bottom }]}>
        {isAdFilled && <Text style={styles.adLabel}>広告</Text>}
        <View style={styles.adRow}>
          <BannerAd
            unitId={bannerAdUnitId}
            size={BannerAdSize.BANNER}
            onAdLoaded={() => setIsAdFilled(true)}
            onAdFailedToLoad={() => setIsAdFilled(false)}
          />
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
    // 【AdMobポリシー対応】コンテンツと広告を視覚的に切り離すための帯。
    // 詰めすぎると「タブバーがあった位置に同じ高さの広告が入れ替わる」構図になり、
    // ナビゲーションと誤認されうるので上の余白は削らないこと
    paddingTop: 4,
  },
  adRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adLabel: {
    // バナーの上に置く。絶対配置で左余白へ重ねると、320pt幅の端末で
    // バナーと重なってしまう
    marginLeft: 8,
    marginBottom: 2,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: fontFamily.regular,
    color: colors.textDisabled,
  },
});
