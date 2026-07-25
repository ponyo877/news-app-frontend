import type { CheerioAPI } from 'cheerio/slim';

import { livedoorEngine } from '@/scraper/engines/livedoor';
import type { BlogEngine } from '@/scraper/engines/types';

// 対応エンジンのレジストリ。新しいブログ種別はここに追加する
const engines: BlogEngine[] = [livedoorEngine];

export function detectEngine($: CheerioAPI): BlogEngine | undefined {
  return engines.find((engine) => engine.matches($));
}
