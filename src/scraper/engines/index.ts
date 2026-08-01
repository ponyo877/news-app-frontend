import type { CheerioAPI } from 'cheerio/slim';

import { genericEngine } from '@/scraper/engines/generic';
import { livedoorEngine } from '@/scraper/engines/livedoor';
import type { BlogEngine } from '@/scraper/engines/types';
import type { SiteRule } from '@/scraper/types';

// 対応エンジンのレジストリ。構造検出のlivedoorを優先し、
// 非対応構造はルールのengine設定がある場合のみ汎用エンジンが受ける
const engines: BlogEngine[] = [livedoorEngine, genericEngine];

export function detectEngine($: CheerioAPI, rule?: SiteRule): BlogEngine | undefined {
  return engines.find((engine) => engine.matches($, rule));
}
