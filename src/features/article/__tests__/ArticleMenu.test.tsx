import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { ArticleMenu } from '@/features/article/ArticleMenu';
import type { RootNavigation } from '@/navigation/types';
import type { ArticleMeta } from '@/stores/articleStatusStore';
import { useSiteFilterStore } from '@/stores/siteFilterStore';

// 報告カードはネットワークを叩くので、送信先だけ差し替える(このファイルでは送信までしない)
jest.mock('@/api/endpoints', () => ({ postArticleReport: jest.fn() }));

// 記事画面から「このサイトを非表示」できることの回帰テスト。
// 確認を挟むこと自体が仕様(誤タップで読んでいる記事が消えると取り返しがつかない)なので、
// キャンセル時に何も起きないことまで含めて固定する。背景は docs/COMPETITORS.md

const article: ArticleMeta = {
  id: 'a1',
  titles: 'テスト記事',
  url: 'https://example.com/a1',
  image: '',
  siteID: 'site-1',
  sitetitle: 'テスト速報',
  publishedAt: '2026-08-21T00:00:00Z',
};

async function openMenu(navigation: Partial<RootNavigation>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = await render(
    <QueryClientProvider client={client}>
      <ArticleMenu
        article={article}
        navigation={navigation as RootNavigation}
        onStartTts={jest.fn()}
      />
    </QueryClientProvider>,
  );
  await fireEvent.press(view.getByLabelText('メニュー'));
  return view;
}

// Alert.alert に渡されたボタンのうち、ラベルが一致するものの onPress を呼ぶ
function pressAlertButton(label: string): void {
  const buttons = jest.mocked(Alert.alert).mock.calls[0]?.[2];
  const button = buttons?.find((b) => b.text === label);
  if (!button) {
    throw new Error(`Alertに「${label}」ボタンが無い`);
  }
  button.onPress?.();
}

beforeEach(() => {
  useSiteFilterStore.setState({ blockedSiteIds: [], preferredSiteIds: [] });
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ArticleMenu のサイト非表示', () => {
  it('項目にサイト名が出る(どのサイトを消すのか押す前にわかる)', async () => {
    const view = await openMenu({ goBack: jest.fn() });

    expect(view.getByText('テスト速報を非表示')).toBeTruthy();
  });

  it('押しただけでは消さず、確認を出す', async () => {
    const view = await openMenu({ goBack: jest.fn() });

    await fireEvent.press(view.getByText('テスト速報を非表示'));

    expect(Alert.alert).toHaveBeenCalled();
    expect(useSiteFilterStore.getState().blockedSiteIds).toEqual([]);
  });

  it('「非表示にする」を選ぶとブロックされ、記事画面から戻る', async () => {
    const goBack = jest.fn();
    const view = await openMenu({ goBack });

    await fireEvent.press(view.getByText('テスト速報を非表示'));
    pressAlertButton('非表示にする');

    expect(useSiteFilterStore.getState().blockedSiteIds).toEqual(['site-1']);
    expect(goBack).toHaveBeenCalled();
  });

  it('「キャンセル」ならブロックせず、記事画面にとどまる', async () => {
    const goBack = jest.fn();
    const view = await openMenu({ goBack });

    await fireEvent.press(view.getByText('テスト速報を非表示'));
    pressAlertButton('キャンセル');

    expect(useSiteFilterStore.getState().blockedSiteIds).toEqual([]);
    expect(goBack).not.toHaveBeenCalled();
  });
});

// 報告はGoogleフォーム遷移ではなく、同じModalの中身を報告カードに切り替えて出す
describe('ArticleMenu の表示の不具合を報告', () => {
  it('押すとメニュー項目が消えて報告カードが出る(WebViewへは遷移しない)', async () => {
    const navigate = jest.fn();
    const view = await openMenu({ goBack: jest.fn(), navigate });

    await fireEvent.press(view.getByText('表示の不具合を報告'));

    expect(view.queryByText('文字サイズ')).toBeNull();
    expect(view.getByText('送信')).toBeTruthy();
    expect(view.getByText('テスト記事')).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('キャンセルで閉じ、次に開いたときはメニューに戻っている', async () => {
    const view = await openMenu({ goBack: jest.fn() });

    await fireEvent.press(view.getByText('表示の不具合を報告'));
    await fireEvent.press(view.getByText('キャンセル'));
    expect(view.queryByText('送信')).toBeNull();

    await fireEvent.press(view.getByLabelText('メニュー'));
    expect(view.getByText('文字サイズ')).toBeTruthy();
    expect(view.queryByText('送信')).toBeNull();
  });
});
