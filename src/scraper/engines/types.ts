import type { CheerioAPI } from 'cheerio/slim';

export type FetchPage = (url: string) => Promise<string>;

// ブログエンジン(テンプレート種別)の抽象(P3)。
// 「本文の特定・複数ページ結合・記事本体以外を捨てる構造再構築」はエンジンごとに異なるため
// この単位で実装を差し替える。現状はlivedoor系のみだが、
// FC2/はてな等への対応はエンジンを1つ追加してregistryに登録するだけでよい。
// サイト個別の広告除去等はエンジンの上に載るSiteRule(defaultRules.json)が担う
export interface BlogEngine {
  name: string;
  // このエンジンで処理できるDOM構造かを判定する
  matches($: CheerioAPI): boolean;
  // head/bodyを記事本体だけに再構築する(複数ページの結合を含む)
  prepare($: CheerioAPI, fetchPage: FetchPage): Promise<void>;
}
