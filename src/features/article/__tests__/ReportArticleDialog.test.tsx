import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { postArticleReport } from '@/api/endpoints';
import { ReportArticleDialog } from '@/features/article/ReportArticleDialog';
import { logEvent } from '@/lib/analytics';
import type { ArticleMeta } from '@/stores/articleStatusStore';
import { useUserStore } from '@/stores/userStore';

jest.mock('@/api/endpoints', () => ({ postArticleReport: jest.fn() }));
jest.mock('@/lib/analytics', () => ({ logEvent: jest.fn() }));
// 端末情報の収集(expo-application・ルールストア)だけ固定値にし、理由の定義は本物を使う
jest.mock('@/lib/articleReport', () => ({
  ...jest.requireActual<typeof import('@/lib/articleReport')>('@/lib/articleReport'),
  collectArticleReportContext: () => ({ platform: 'ios', appversion: '1.52', rulesversion: 4 }),
}));

const article: ArticleMeta = {
  id: 'a1',
  titles: 'テスト記事',
  url: 'https://example.com/a1',
  image: '',
  siteID: 'site-1',
  sitetitle: 'テスト速報',
  publishedAt: '2026-08-25T00:00:00Z',
};

const mockedPost = jest.mocked(postArticleReport);

async function renderDialog(onClose = jest.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = await render(
    <QueryClientProvider client={client}>
      <ReportArticleDialog article={article} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { view, onClose };
}

beforeEach(() => {
  useUserStore.setState({ devicehash: 'hash-1' });
  mockedPost.mockReset();
  jest.mocked(logEvent).mockReset();
});

describe('ReportArticleDialog', () => {
  it('理由を選ぶまで送信できない', async () => {
    const { view } = await renderDialog();

    await fireEvent.press(view.getByText('送信'));

    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('理由を選んで送信すると記事のURL・ID・端末情報つきで送られ、完了表示になる', async () => {
    mockedPost.mockResolvedValue({ ok: true, status: 200 });
    const { view } = await renderDialog();

    await fireEvent.press(view.getByText('画像・動画・Xのポストが出ない'));
    await fireEvent.press(view.getByText('送信'));

    await waitFor(() => expect(view.getByText('報告を受け付けました')).toBeTruthy());
    expect(mockedPost).toHaveBeenCalledWith({
      articleId: 'a1',
      url: 'https://example.com/a1',
      sitetitle: 'テスト速報',
      devicehash: 'hash-1',
      reason: 'missing_media',
      platform: 'ios',
      appversion: '1.52',
      rulesversion: 4,
    });
    expect(logEvent).toHaveBeenCalledWith('article_report', {
      site: 'テスト速報',
      reason: 'missing_media',
    });
  });

  it('完了表示のOKで閉じる', async () => {
    mockedPost.mockResolvedValue({ ok: true, status: 200 });
    const { view, onClose } = await renderDialog();

    await fireEvent.press(view.getByText('その他'));
    await fireEvent.press(view.getByText('送信'));
    await waitFor(() => expect(view.getByText('OK')).toBeTruthy());
    await fireEvent.press(view.getByText('OK'));

    expect(onClose).toHaveBeenCalled();
  });

  it('サーバエラー(5xx)は混雑の文言を出し、閉じずに再送信できる', async () => {
    mockedPost.mockResolvedValue({ ok: false, status: 503 });
    const { view } = await renderDialog();

    await fireEvent.press(view.getByText('広告や関係ないリンクが残っている'));
    await fireEvent.press(view.getByText('送信'));

    await waitFor(() => expect(view.getByText(/サーバーが混み合っています/)).toBeTruthy());
    expect(view.getByText('送信')).toBeTruthy();
    expect(logEvent).toHaveBeenCalledWith('article_report_failed', { kind: 'server' });

    mockedPost.mockResolvedValue({ ok: true, status: 200 });
    await fireEvent.press(view.getByText('送信'));
    await waitFor(() => expect(view.getByText('報告を受け付けました')).toBeTruthy());
    expect(mockedPost).toHaveBeenCalledTimes(2);
  });

  it('通信エラー(fetch例外)は通信失敗の文言を出す', async () => {
    mockedPost.mockRejectedValue(new TypeError('Network request failed'));
    const { view } = await renderDialog();

    await fireEvent.press(view.getByText('本文が欠けている・崩れている'));
    await fireEvent.press(view.getByText('送信'));

    await waitFor(() => expect(view.getByText(/通信に失敗しました/)).toBeTruthy());
    expect(logEvent).toHaveBeenCalledWith('article_report_failed', { kind: 'network' });
  });

  it('送信中に続けて押しても1回しか送らない', async () => {
    let resolve: (value: { ok: boolean; status: number }) => void = () => undefined;
    mockedPost.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { view } = await renderDialog();

    await fireEvent.press(view.getByText('その他'));
    await fireEvent.press(view.getByText('送信'));
    // 送信中はラベルがインジケータに変わるので、ボタンはラベルで取る
    await fireEvent.press(view.getByLabelText('送信'));
    await fireEvent.press(view.getByLabelText('送信'));

    expect(mockedPost).toHaveBeenCalledTimes(1);
    resolve({ ok: true, status: 200 });
    await waitFor(() => expect(view.getByText('報告を受け付けました')).toBeTruthy());
  });

  it('キャンセルで閉じる', async () => {
    const { view, onClose } = await renderDialog();

    await fireEvent.press(view.getByText('キャンセル'));

    expect(onClose).toHaveBeenCalled();
    expect(mockedPost).not.toHaveBeenCalled();
  });
});
