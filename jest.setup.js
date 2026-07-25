// react-native-mmkv はネイティブ実装(Nitro)のため Jest ではメモリ実装に差し替える
jest.mock('react-native-mmkv', () => {
  const createStore = () => {
    const store = new Map();
    return {
      set: (key, value) => store.set(key, value),
      getString: (key) => {
        const v = store.get(key);
        return typeof v === 'string' ? v : undefined;
      },
      getBoolean: (key) => {
        const v = store.get(key);
        return typeof v === 'boolean' ? v : undefined;
      },
      getNumber: (key) => {
        const v = store.get(key);
        return typeof v === 'number' ? v : undefined;
      },
      contains: (key) => store.has(key),
      remove: (key) => store.delete(key),
      getAllKeys: () => [...store.keys()],
      clearAll: () => store.clear(),
    };
  };
  return { createMMKV: createStore };
});
