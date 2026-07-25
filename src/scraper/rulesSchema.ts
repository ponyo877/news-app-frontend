import { z } from 'zod';

import type { ScraperRuleSet } from '@/scraper/types';

// リモート配信されるルールJSONの検証。
// POST /v1/static は認証がないため、不正・破損したJSONを確実に弾けるよう
// サイズ上限つきで厳格に検証する(未知フィールドは前方互換のため無視)
const anchorCleanupSchema = z.object({
  selector: z.string().min(1).max(200),
  hrefPrefix: z.string().min(1).max(300).optional(),
  hrefNotPrefix: z.string().min(1).max(300).optional(),
  trailingBr: z.number().int().min(0).max(10),
});

const siteRuleSchema = z.object({
  name: z.string().min(1).max(100),
  urlPrefixes: z.array(z.string().min(1).max(200)).max(10),
  siteTitles: z.array(z.string().min(1).max(100)).max(10).optional(),
  removeSelectors: z.array(z.string().min(1).max(300)).max(50).optional(),
  anchorCleanups: z.array(anchorCleanupSchema).max(10).optional(),
  trimTrailingBrs: z.number().int().min(0).max(50).optional(),
});

export const ruleSetSchema = z.object({
  version: z.number().int().min(1),
  rules: z.array(siteRuleSchema).max(100),
});

export function parseRuleSet(json: unknown): ScraperRuleSet {
  return ruleSetSchema.parse(json);
}
