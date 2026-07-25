// react-native-mmkv はネイティブ実装のため Jest ではメモリ実装に差し替える
jest.mock('react-native-mmkv', () => {
  class MMKV {
    store = new Map();
    set(key, value) {
      this.store.set(key, value);
    }
    getString(key) {
      const v = this.store.get(key);
      return typeof v === 'string' ? v : undefined;
    }
    getBoolean(key) {
      const v = this.store.get(key);
      return typeof v === 'boolean' ? v : undefined;
    }
    getNumber(key) {
      const v = this.store.get(key);
      return typeof v === 'number' ? v : undefined;
    }
    contains(key) {
      return this.store.has(key);
    }
    delete(key) {
      this.store.delete(key);
    }
    getAllKeys() {
      return [...this.store.keys()];
    }
    clearAll() {
      this.store.clear();
    }
  }
  return { MMKV };
});
