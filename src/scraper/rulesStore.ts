import { BASE_URL } from '@/api/client';
import defaultRulesJson from '@/scraper/defaultRules.json';
import { parseRuleSet } from '@/scraper/rulesSchema';
import type { ScraperRuleSet } from '@/scraper/types';
import { storage } from '@/stores/mmkv';

// ルールの取得戦略:
//   1. リモート(/v1/static/scraper-rules.json)から取得できた検証済みルールをMMKVにキャッシュ
//   2. 起動時はキャッシュ→同梱defaultRules.jsonの順で解決(オフラインでも動く)
//   3. versionが大きい方を採用(アプリ更新で同梱版が新しくなるケースに対応)
// これによりサイト側のテンプレート変更に「JSONを置き直すだけ」で追従できる(ストア審査不要)
const RULES_CACHE_KEY = 'scraperRules.v1';
export const REMOTE_RULES_FILENAME = 'scraper-rules.json';

// 同梱ルールも起動時に一度スキーマ検証する(壊れたJSONのコミットをテストでも検出)
export const bundledRuleSet: ScraperRuleSet = parseRuleSet(defaultRulesJson);

let activeRuleSet: ScraperRuleSet | null = null;

export function getActiveRuleSet(): ScraperRuleSet {
  if (activeRuleSet) {
    return activeRuleSet;
  }
  const cached = readCachedRuleSet();
  activeRuleSet =
    cached && cached.version >= bundledRuleSet.version ? cached : bundledRuleSet;
  return activeRuleSet;
}

// 起動時にfire-and-forgetで呼ぶ。失敗(オフライン・未配置・不正JSON)は同梱版のまま継続
export async function refreshRemoteRules(): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/v1/static/${REMOTE_RULES_FILENAME}`);
    if (!res.ok) {
      return;
    }
    const remote = parseRuleSet(await res.json());
    if (remote.version >= bundledRuleSet.version) {
      storage.set(RULES_CACHE_KEY, JSON.stringify(remote));
      activeRuleSet = remote;
    }
  } catch {
    // リモートルールは任意機能。失敗してもアプリ動作に影響させない
  }
}

function readCachedRuleSet(): ScraperRuleSet | null {
  const cached = storage.getString(RULES_CACHE_KEY);
  if (!cached) {
    return null;
  }
  try {
    return parseRuleSet(JSON.parse(cached));
  } catch {
    storage.remove(RULES_CACHE_KEY);
    return null;
  }
}

// テスト用: メモリ状態をリセット
export function resetRuleSetForTesting(): void {
  activeRuleSet = null;
}
