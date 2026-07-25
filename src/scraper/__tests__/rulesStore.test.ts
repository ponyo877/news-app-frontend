import {
  REMOTE_RULES_FILENAME,
  bundledRuleSet,
  getActiveRuleSet,
  refreshRemoteRules,
  resetRuleSetForTesting,
} from '@/scraper/rulesStore';
import { storage } from '@/stores/mmkv';

function mockFetchJson(status: number, body: unknown) {
  return jest
    .spyOn(global, 'fetch')
    .mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
}

afterEach(() => {
  jest.restoreAllMocks();
  storage.clearAll();
  resetRuleSetForTesting();
});

describe('rulesStore', () => {
  it('キャッシュがなければ同梱ルールを返す', () => {
    expect(getActiveRuleSet()).toBe(bundledRuleSet);
  });

  it('同梱defaultRules.jsonはスキーマ検証を通る(壊れたコミットの検出)', () => {
    expect(bundledRuleSet.rules.length).toBeGreaterThanOrEqual(6);
  });

  it('リモートの新バージョンを採用しキャッシュする', async () => {
    const remote = {
      version: bundledRuleSet.version + 1,
      rules: [{ name: 'テスト', urlPrefixes: ['example.com/'], removeSelectors: ['iframe'] }],
    };
    mockFetchJson(200, remote);
    await refreshRemoteRules();
    expect(getActiveRuleSet().version).toBe(remote.version);
    // 再起動相当(メモリリセット)後もキャッシュから復元される
    resetRuleSetForTesting();
    expect(getActiveRuleSet().version).toBe(remote.version);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining(REMOTE_RULES_FILENAME));
  });

  it('リモートが旧バージョンなら無視する', async () => {
    mockFetchJson(200, { version: 0, rules: [] });
    await refreshRemoteRules();
    expect(getActiveRuleSet()).toBe(bundledRuleSet);
  });

  it('不正なリモートJSONは無視する(スキーマ検証)', async () => {
    mockFetchJson(200, { version: 'not-a-number', rules: 'broken' });
    await refreshRemoteRules();
    expect(getActiveRuleSet()).toBe(bundledRuleSet);
  });

  it('404・ネットワークエラーは無視する', async () => {
    mockFetchJson(404, {});
    await refreshRemoteRules();
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('offline'));
    await refreshRemoteRules();
    expect(getActiveRuleSet()).toBe(bundledRuleSet);
  });
});
