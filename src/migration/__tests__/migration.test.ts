import { MIGRATION_KEY, runLegacyMigrationIfNeeded } from '@/migration';
import { cleanupLegacyFiles } from '@/migration/cleanup';
import { readLegacyPrefs } from '@/migration/legacyPrefs';
import { readLegacySkipIds } from '@/migration/legacySkipIds';
import { storage } from '@/stores/mmkv';
import { useSiteFilterStore } from '@/stores/siteFilterStore';
import { useUserStore } from '@/stores/userStore';

jest.mock('@/migration/legacyPrefs');
jest.mock('@/migration/legacySkipIds');
jest.mock('@/migration/cleanup');

const mockReadLegacyPrefs = jest.mocked(readLegacyPrefs);
const mockReadLegacySkipIds = jest.mocked(readLegacySkipIds);
const mockCleanup = jest.mocked(cleanupLegacyFiles);

beforeEach(() => {
  jest.clearAllMocks();
  storage.clearAll();
  useUserStore.setState({ name: 'まとめくん', avatarId: 1, devicehash: null });
  useSiteFilterStore.setState({ blockedSiteIds: [] });
  mockReadLegacySkipIds.mockResolvedValue([]);
  mockCleanup.mockResolvedValue();
});

describe('runLegacyMigrationIfNeeded', () => {
  it('旧prefsが読めたら devicehash/Name/Icon を引き継ぎ done を記録する', async () => {
    mockReadLegacyPrefs.mockResolvedValue({
      devicehash: 'abc123def456',
      name: 'ぽにょ',
      iconPath: 'assets/images/icon/myimage_7.png',
    });
    mockReadLegacySkipIds.mockResolvedValue(['site1', 'site2']);

    await runLegacyMigrationIfNeeded();

    const user = useUserStore.getState();
    expect(user.devicehash).toBe('abc123def456');
    expect(user.name).toBe('ぽにょ');
    expect(user.avatarId).toBe(7);
    expect(useSiteFilterStore.getState().blockedSiteIds).toEqual(['site1', 'site2']);
    expect(storage.getString(MIGRATION_KEY)).toBe('done');
    expect(mockCleanup).toHaveBeenCalled();
  });

  it('旧prefsが無い(新規インストール)は done-fresh を記録し何も引き継がない', async () => {
    mockReadLegacyPrefs.mockResolvedValue({ devicehash: null, name: null, iconPath: null });

    await runLegacyMigrationIfNeeded();

    expect(useUserStore.getState().devicehash).toBeNull();
    expect(storage.getString(MIGRATION_KEY)).toBe('done-fresh');
  });

  it('読み取り失敗は failed を記録して継続する(無限リトライしない)', async () => {
    mockReadLegacyPrefs.mockRejectedValue(new Error('native error'));

    await runLegacyMigrationIfNeeded();

    expect(storage.getString(MIGRATION_KEY)).toBe('failed');
    // 2回目はスキップされる
    await runLegacyMigrationIfNeeded();
    expect(mockReadLegacyPrefs).toHaveBeenCalledTimes(1);
  });

  it('移行済みなら何もしない(冪等)', async () => {
    storage.set(MIGRATION_KEY, 'done');
    await runLegacyMigrationIfNeeded();
    expect(mockReadLegacyPrefs).not.toHaveBeenCalled();
  });

  it('不正なアイコンパスはデフォルトのまま', async () => {
    mockReadLegacyPrefs.mockResolvedValue({
      devicehash: 'abc123def456',
      name: null,
      iconPath: 'assets/images/icon/myimage_99.png',
    });

    await runLegacyMigrationIfNeeded();

    expect(useUserStore.getState().avatarId).toBe(1);
    expect(useUserStore.getState().name).toBe('まとめくん');
  });
});
