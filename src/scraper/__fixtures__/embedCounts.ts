import type { Cheerio, CheerioAPI } from 'cheerio/slim';
import type { AnyNode } from 'domhandler';

// 原文の本文と整形結果で「埋め込みが減っていない」ことを比べるための集計。
// 1.51でXポスト・imgur・Instagram・YouTubeが空白になった回帰の検知用
export interface EmbedCounts {
  tweets: number;
  // widgets.jsがツイートIDを読むhref(剥奪されていないこと)
  tweetLinks: number;
  imgur: number;
  instagram: number;
  youtube: number;
}

export function countEmbeds($: CheerioAPI, root: Cheerio<AnyNode>): EmbedCounts {
  return {
    tweets: root.find('blockquote.twitter-tweet').length,
    tweetLinks: root.find('blockquote.twitter-tweet a[href*="/status/"]').length,
    imgur: root.find('blockquote.imgur-embed-pub').length,
    instagram: root.find('blockquote.instagram-media').length,
    youtube: root.find(
      'iframe[src*="youtube.com/embed"], iframe[src*="youtube-nocookie.com/embed"]',
    ).length,
  };
}

// 出力に含まれるべき描画スクリプト(種類ごとに1本)
export function expectedEmbedScripts(counts: EmbedCounts): string[] {
  const scripts: string[] = [];
  if (counts.tweets > 0) scripts.push('https://platform.twitter.com/widgets.js');
  if (counts.imgur > 0) scripts.push('https://s.imgur.com/min/embed.js');
  if (counts.instagram > 0) scripts.push('https://www.instagram.com/embed.js');
  return scripts;
}
