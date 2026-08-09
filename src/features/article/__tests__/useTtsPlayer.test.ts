import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useTtsPlayer } from '@/features/article/useTtsPlayer';
import type { TtsSegment } from '@/scraper/ttsScript';

const mockSpeak = jest.fn<void, [string, Record<string, unknown>]>();
const mockStop = jest.fn<Promise<void>, []>();
const mockGetAvailableVoicesAsync = jest.fn<Promise<unknown[]>, []>();

jest.mock('expo-speech', () => ({
  speak: (text: string, options: Record<string, unknown>) => mockSpeak(text, options),
  stop: () => mockStop(),
  getAvailableVoicesAsync: () => mockGetAvailableVoicesAsync(),
}));
jest.mock('@/lib/analytics', () => ({ logEvent: jest.fn() }));

const segments: TtsSegment[] = [
  { text: '地の文です。', voiceIndex: 0 },
  { text: '赤字のレスです。', voiceIndex: 1 },
];

describe('useTtsPlayer', () => {
  beforeEach(() => {
    mockSpeak.mockReset();
    mockStop.mockReset();
    mockGetAvailableVoicesAsync.mockReset();
    mockGetAvailableVoicesAsync.mockResolvedValue([]);
  });

  // iOSの消音スイッチで無音になる不具合(1.49)の回帰防止。
  // 既定ではアプリの音声セッションを使うため、マナーモードだと
  // 「進捗だけ進んで聞こえない」状態になる
  it('iOSの消音スイッチでも鳴るよう自前の音声セッションを使う', async () => {
    const { result } = await renderHook(() => useTtsPlayer(segments, 'テストサイト'));

    await act(() => {
      result.current.play();
    });

    await waitFor(() => expect(mockSpeak).toHaveBeenCalledTimes(1));
    expect(mockSpeak.mock.calls[0]?.[1]).toMatchObject({
      language: 'ja-JP',
      useApplicationAudioSession: false,
    });
  });

  it('セグメントが空なら再生しない', async () => {
    const { result } = await renderHook(() => useTtsPlayer([], 'テストサイト'));

    await act(() => {
      result.current.play();
    });

    expect(mockSpeak).not.toHaveBeenCalled();
  });
});
