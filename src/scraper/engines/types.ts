import type { CheerioAPI } from 'cheerio/slim';

import type { SiteRule } from '@/scraper/types';

export type FetchPage = (url: string) => Promise<string>;

// ブログエンジン(テンプレート種別)の抽象(P3)。
// 「本文の特定・複数ページ結合・記事本体以外を捨てる構造再構築」はエンジンごとに異なるため
// この単位で実装を差し替える。livedoor系は構造検出、それ以外(WordPress/FC2/Seesaa等)は
// SiteRuleのengine設定で本文セレクタを与える汎用エンジンが処理する。
// サイト個別の広告除去等はエンジンの上に載るSiteRule(defaultRules.json)が担う
export interface BlogEngine {
  name: string;
  // このエンジンで処理できるDOM構造かを判定する(ruleは汎用エンジンの設定参照用)
  matches($: CheerioAPI, rule?: SiteRule): boolean;
  // head/bodyを記事本体だけに再構築する(複数ページの結合を含む)
  prepare($: CheerioAPI, fetchPage: FetchPage, rule?: SiteRule): Promise<void>;
}
