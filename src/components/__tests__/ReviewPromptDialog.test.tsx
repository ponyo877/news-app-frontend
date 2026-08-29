import { fireEvent, render } from '@testing-library/react-native';

import { ReviewPromptDialog } from '@/components/ReviewPromptDialog';
import { reviewPromptCopy } from '@/lib/review';

jest.mock('expo-store-review', () => ({ isAvailableAsync: jest.fn(), requestReview: jest.fn() }));

describe('ReviewPromptDialog', () => {
  it('文言と2つのボタンを出し、それぞれのハンドラを呼ぶ', async () => {
    const onAccept = jest.fn();
    const onLater = jest.fn();
    const copy = reviewPromptCopy('tts_complete', 4);
    const view = await render(
      <ReviewPromptDialog visible {...copy} onAccept={onAccept} onLater={onLater} />,
    );

    expect(view.getByText(copy.title)).toBeTruthy();
    expect(view.getByText(copy.message)).toBeTruthy();
    await fireEvent.press(view.getByText('評価する'));
    expect(onAccept).toHaveBeenCalledTimes(1);
    await fireEvent.press(view.getByText('あとで'));
    expect(onLater).toHaveBeenCalledTimes(1);
  });

  it('visible=false なら何も出さない', async () => {
    const copy = reviewPromptCopy('favorite', 4);
    const view = await render(
      <ReviewPromptDialog visible={false} {...copy} onAccept={jest.fn()} onLater={jest.fn()} />,
    );
    expect(view.queryByText('評価する')).toBeNull();
  });
});
