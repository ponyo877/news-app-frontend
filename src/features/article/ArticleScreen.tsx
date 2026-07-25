import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';

import { incrementView } from '@/api/endpoints';
import { EmptyMessage } from '@/components/EmptyMessage';
import type { RootStackParamList } from '@/navigation/types';
import { useArticleStatusStore } from '@/stores/articleStatusStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Article'>;

// 記事詳細画面。WebView本体はPhase 3で実装。
// 既読化+履歴追加+閲覧数はマウント時に1回(履歴カード経由でも同一挙動)
export function ArticleScreen({ route }: Props) {
  const { article } = route.params;
  const markRead = useArticleStatusStore((s) => s.markRead);

  useEffect(() => {
    markRead(article);
    incrementView(article.id);
    // マウント時のみ実行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <EmptyMessage message="記事画面(Phase 3で実装)" />;
}
