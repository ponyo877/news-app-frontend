import { MAX_NG_WORDS, useNgWordStore } from '@/stores/ngWordStore';

describe('ngWordStore', () => {
  beforeEach(() => {
    useNgWordStore.setState({ ngWords: [] });
  });

  it('trimして追加し、空文字・重複は無視する', () => {
    const { addWord } = useNgWordStore.getState();
    addWord('  パチンコ  ');
    addWord('パチンコ');
    addWord('   ');
    expect(useNgWordStore.getState().ngWords).toEqual(['パチンコ']);
  });

  it('上限50件を超えて追加できない', () => {
    const { addWord } = useNgWordStore.getState();
    for (let i = 0; i < MAX_NG_WORDS + 5; i++) {
      addWord(`word-${i}`);
    }
    expect(useNgWordStore.getState().ngWords).toHaveLength(MAX_NG_WORDS);
  });

  it('削除できる', () => {
    const { addWord, removeWord } = useNgWordStore.getState();
    addWord('a');
    addWord('b');
    removeWord('a');
    expect(useNgWordStore.getState().ngWords).toEqual(['b']);
  });
});
