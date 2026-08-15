import type { CheerioAPI } from 'cheerio/slim';
import { isTag, isText } from 'domhandler';
import type { AnyNode, Element, Text } from 'domhandler';

import { loadDoc } from '@/scraper/htmlLoad';

// スレ読み上げのスクリプト生成(docs/PHASE2.5-DESIGN.md §B)。
//
// まとめ記事の文字色は実質「話者」のマークアップ(黒=地の文、赤=強調レス等)。
// 色ごとに読み手(voiceIndex)を変えることで、色分けの読書体験を耳に翻訳する。
// voiceIndex 0 = ナレーター(デフォルト色)、1..N = 記事内の色の出現順。
// 色をまったく使わない記事では段落交互の2声に自動縮退する

export interface TtsSegment {
  text: string;
  voiceIndex: number;
}

// 音声プールのサイズ(超過した色は循環)。iOSのja-JPボイス+pitch差で賄える現実的な数
export const TTS_VOICE_POOL_SIZE = 4;

// ネットスラングの読み替え(端末TTSの読み間違い補正)。最小限から育てる
const READING_DICTIONARY: [RegExp, string][] = [
  [/ｗ{2,}|w{2,}/g, ''], // 大量の草は読まない(「ダブリューダブリュー…」事故の防止)
  [/(?<=[ぁ-んァ-ヶ一-龠])[ｗw](?=\s|$)/gm, ''], // 文末の単発草
  [/>>\d+/g, ''], // 安価は読まない
  [/https?:\/\/\S+/g, ''], // URL
  [/[■□◆◇★☆●○]{2,}/g, ''], // 装飾記号の連続
  // 本文と同じノードに混ざる日時+ID(「2026/07/25(土) 09:19:16.82 ID:tFFy/Iv59.net」)。
  // メタ行として分離できないサイト向けの保険
  [/\d{4}\/\d{1,2}\/\d{1,2}\([日月火水木金土]\)\s*\d{1,2}:\d{2}:\d{2}(\.\d+)?/g, ''],
  [/\sID[:：][\w+/.-]+/gi, ''],
];

// AA(アスキーアート)らしさ: 記号・空白率が高い行は読まない
function looksLikeAsciiArt(text: string): boolean {
  if (text.length < 10) {
    return false;
  }
  const symbolic = text.replace(/[ぁ-んァ-ヶ一-龠a-zA-Z0-9ａ-ｚＡ-Ｚ０-９、。!?!?]/g, '');
  return symbolic.length / text.length > 0.5;
}

// レスのメタ情報(番号・ハンドル・日時・ID)は読まない。
// まとめ記事のHTMLでは「1 名前:」「風吹けば名無し」「2026/07/25(土) 09:19:16 ID:xxx」が
// 本文と別ノードで交互に並ぶため、素直に読むと1レスごとに事務的な前置きが入って
// ラジオとして聴けたものではなくなる。読むのはスレタイと書き込み本文だけにする
const METADATA_PATTERNS: RegExp[] = [
  // レス番号(「1:」「115:」「1 名前:」)。本文の「10:30」を巻き込まないよう全体一致に限定
  /^\d{1,4}\s*[:：]?\s*(名前|以下)?\s*[:：]?$/,
  // コテハン付きのレスヘッダー(「1 名前：煮卵 ★：」)。名無しパターンに当たらない
  /^\d{1,4}\s*名前\s*[:：]/,
  // 日付・時刻・ID(曜日つき2ch形式、記事の投稿日時、単体のID/BE)
  /^\d{2,4}[/-]\d{1,2}[/-]\d{1,2}.*$/,
  /^\d{1,2}[:：]\d{2}([:：]\d{2})?(\.\d+)?$/,
  /^(\[\]\s*)?投稿日\s*[:：]/,
  /^ID[:：]/i,
  /(^|\s)●?\s*BE[:：]/i,
  // 嫌儲系のコテハン(「ピマリシン(福岡県) [ﾆﾀﾞ]」= ランダム名+地域+キャリア)。
  // 末尾の[]付き括弧書きが目印。本文がこの形で終わることはまずない
  /^.{0,24}[（(][^）)]{1,12}[）)]\s*\[[^\]]{1,10}\]$/,
  // 「以下、○○でお送りします」形式の定型ハンドル(読点を含むので下の判定に掛からない)
  /^以下、.*でお送りします。?$/,
  // 名無しハンドル。サイトごとに文言が違うが、ハンドルは単体ノードに置かれ句読点を持たない。
  // 「名無しさんたちの書き込みを読むと…」のような本文を巻き込まないよう、
  // 句読点を含む行は本文とみなして除外対象から外す
  /^[^。、！？!?]*(名無し|風吹けば|それでも動く)[^。、！？!?]*$/,
  // 記事メタ(投稿者・コメント数・日付見出し・引用元)
  /^投稿者\s*[:：]/,
  /^コメント\s*\d*$/,
  /^\d{1,2}月\d{0,2}日?$/,
  /^引用元\s*[:：]?\s*[・:：]?$/,
  // 数字のみ(コメント数・いいね数のカウンタ)
  /^\d{1,6}$/,
];

function isMetadata(text: string): boolean {
  // 長文は本文とみなす(日付で始まる書き込みや、名無しに言及する本文を守る)
  if (text.length > 40) {
    return false;
  }
  return METADATA_PATTERNS.some((pattern) => pattern.test(text));
}

function cleanText(raw: string): string {
  let text = raw;
  for (const [pattern, replacement] of READING_DICTIONARY) {
    text = text.replace(pattern, replacement);
  }
  return text.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------- 色の解決

const NAMED_COLORS: Record<string, [number, number, number]> = {
  red: [255, 0, 0],
  crimson: [220, 20, 60],
  darkred: [139, 0, 0],
  orange: [255, 165, 0],
  gold: [255, 215, 0],
  yellow: [255, 255, 0],
  green: [0, 128, 0],
  darkgreen: [0, 100, 0],
  lime: [0, 255, 0],
  blue: [0, 0, 255],
  navy: [0, 0, 128],
  darkblue: [0, 0, 139],
  purple: [128, 0, 128],
  violet: [238, 130, 238],
  magenta: [255, 0, 255],
  fuchsia: [255, 0, 255],
  pink: [255, 192, 203],
  deeppink: [255, 20, 147],
  brown: [165, 42, 42],
  black: [0, 0, 0],
  white: [255, 255, 255],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
};

function parseColor(value: string): [number, number, number] | null {
  const v = value.trim().toLowerCase();
  if (NAMED_COLORS[v]) {
    return NAMED_COLORS[v];
  }
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
  const h = hex?.[1];
  if (h !== undefined) {
    if (h.length === 3) {
      return [
        parseInt(h[0]! + h[0]!, 16),
        parseInt(h[1]! + h[1]!, 16),
        parseInt(h[2]! + h[2]!, 16),
      ];
    }
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(v);
  if (rgb?.[1] !== undefined && rgb[2] !== undefined && rgb[3] !== undefined) {
    return [parseInt(rgb[1], 10), parseInt(rgb[2], 10), parseInt(rgb[3], 10)];
  }
  return null;
}

// 近似色を同一話者にまとめる色相バケット(#ff0000と#cc0000は同じ「赤」)。
// 無彩色(黒・グレー・白)はnull=デフォルト色(ナレーター)
export function colorBucket(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const rgbValues = parseColor(value);
  if (!rgbValues) {
    return null;
  }
  const [r, g, b] = rgbValues;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // 無彩色(彩度が低い)はデフォルト扱い
  if (max - min < 40) {
    return null;
  }
  const delta = max - min;
  let hue: number;
  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }
  hue = Math.round(hue * 60);
  if (hue < 0) {
    hue += 360;
  }
  if (hue < 25 || hue >= 330) {
    return 'red';
  }
  if (hue < 60) {
    return 'orange';
  }
  if (hue < 90) {
    return 'yellow';
  }
  if (hue < 170) {
    return 'green';
  }
  if (hue < 260) {
    return 'blue';
  }
  return 'purple';
}

// 要素の実効文字色(自身→祖先の順に style/fontタグを遡る)
function resolveColor(element: Element): string | null {
  let current: Element | null = element;
  while (current) {
    const style = current.attribs?.style;
    if (style) {
      const match = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(style);
      if (match?.[1] !== undefined) {
        return match[1];
      }
    }
    if (current.tagName === 'font' && current.attribs?.color) {
      return current.attribs.color;
    }
    current = current.parent && isTag(current.parent) ? current.parent : null;
  }
  return null;
}

// ---------------------------------------------------------------- スクリプト生成

const BLOCK_TAGS = new Set(['p', 'div', 'blockquote', 'li', 'h1', 'h2', 'h3', 'h4', 'br', 'tr']);
const SKIP_TAGS = new Set(['script', 'style', 'head', 'noscript', 'iframe']);

interface RawSegment {
  text: string;
  bucket: string | null;
}

// 読み上げ位置を画面に追従させるためのアンカー属性。
// WebView側はこの属性でスクロール先とハイライト対象を特定する
export const TTS_ANCHOR_ATTR = 'data-tts';
export const TTS_CURRENT_ATTR = 'data-tts-current';

// ハイライトのスタイル。取得元CSSに上書きされないようhead末尾へ足す
// (serialize.tsのAPP_STYLEと同じ流儀)
const TTS_STYLE =
  `<style>[${TTS_CURRENT_ATTR}]{background:rgba(255,193,7,0.35);` +
  `border-radius:3px;transition:background 0.2s;}</style>`;

export interface TtsScript {
  segments: TtsSegment[];
  // 各セグメントの起点要素に data-tts="添字" を付与したHTML
  html: string;
}

// セグメントを構成するテキストノードにアンカーを打つ。
//
// まとめ記事は <div>文1<br>文2<br>文3</div> のように、ひとつの要素の直下を
// br で区切る書き方が多い。親要素に属性を付けるだけでは最初の1セグメントしか
// 追従できないため、そういう場合はテキストノードをspanで包んで個別に印を付ける。
// 要素の中身がまるごと1セグメントなら、DOMを増やさず親にそのまま付ける
function anchor(nodes: Text[], index: number, $: CheerioAPI): void {
  const first = nodes[0];
  if (!first) {
    return;
  }
  const parent = first.parent && isTag(first.parent) ? first.parent : null;
  if (!parent) {
    return;
  }
  const onlyChild =
    nodes.length === 1 &&
    (parent.children ?? []).filter((c) => !isText(c) || (c.data ?? '').trim() !== '').length === 1;
  if (onlyChild && parent.attribs?.[TTS_ANCHOR_ATTR] === undefined) {
    parent.attribs[TTS_ANCHOR_ATTR] = String(index);
    return;
  }
  // テキストノードをspanで包む。元のCSSに影響しないよう属性は印だけに留める
  for (const node of nodes) {
    if (!node.parent) {
      continue;
    }
    const span = $(`<span ${TTS_ANCHOR_ATTR}="${index}"></span>`);
    $(node).replaceWith(span);
    span.text(node.data ?? '');
  }
}

// 整形済みHTMLから (テキスト, 色バケット) の列を抽出し、
// 同時に各セグメントの起点へアンカーを打ったHTMLを返す。
// テキストノード単位で色を解決し、同色の連続はブロック境界まで結合する。
//
// flushはメタデータ・AAと判定したセグメントを捨てるため、
// 「N番目の要素=N番目のセグメント」という対応は成立しない。
// 採用が確定した時点で採番することで、添字とアンカーを一致させている
export function buildTtsScriptWithAnchors(html: string): TtsScript {
  const $ = loadDoc(html);
  const rawSegments: RawSegment[] = [];
  let currentText = '';
  let currentBucket: string | null = null;
  // いま蓄積中のセグメントを構成するテキストノード
  let currentNodes: Text[] = [];

  const flush = () => {
    const text = cleanText(currentText);
    if (text !== '' && !looksLikeAsciiArt(text) && !isMetadata(text)) {
      anchor(currentNodes, rawSegments.length, $);
      rawSegments.push({ text, bucket: currentBucket });
    }
    currentText = '';
    currentNodes = [];
  };

  const appendText = (node: Text) => {
    const piece = node.data ?? '';
    if (piece.trim() === '') {
      return;
    }
    const parent = node.parent && isTag(node.parent) ? node.parent : null;
    const bucket = parent ? colorBucket(resolveColor(parent)) : null;
    // 色が変わったら話者交代なのでフラッシュ
    if (currentText !== '' && bucket !== currentBucket) {
      flush();
    }
    currentBucket = bucket;
    currentText += piece;
    currentNodes.push(node);
  };

  const walk = (node: AnyNode) => {
    if (isText(node)) {
      appendText(node);
      return;
    }
    if (!isTag(node)) {
      return;
    }
    const element = node;
    if (SKIP_TAGS.has(element.tagName)) {
      return;
    }
    const isBlock = BLOCK_TAGS.has(element.tagName);
    if (isBlock) {
      flush();
    }
    for (const child of element.children ?? []) {
      walk(child);
    }
    if (isBlock) {
      flush();
    }
  };

  for (const node of $.root()[0]?.children ?? []) {
    walk(node);
  }
  flush();

  // 整形済みHTMLはserializeがhead/bodyを付けているのでhead末尾へ足す。
  // cheerio slimは断片入力にhead/bodyを補完しないため、無い場合は先頭に置く
  const head = $('head');
  if (head.length > 0) {
    head.append(TTS_STYLE);
  } else {
    $.root().prepend(TTS_STYLE);
  }
  return {
    segments: assignVoices(rawSegments),
    html: $.root().html() ?? '',
  };
}

// 読み上げスクリプトのみを取り出す。アンカー付きHTMLが要らない呼び出し向け
export function buildTtsScript(html: string): TtsSegment[] {
  return buildTtsScriptWithAnchors(html).segments;
}

// 色の出現順に声を割り当てる(サイトごとの色運用差に頑健)。
// 色がまったく無い記事は段落交互の2声に縮退
function assignVoices(rawSegments: RawSegment[]): TtsSegment[] {
  const hasColor = rawSegments.some((segment) => segment.bucket !== null);
  if (!hasColor) {
    return rawSegments.map((segment, index) => ({
      text: segment.text,
      voiceIndex: index % 2,
    }));
  }
  const bucketToVoice = new Map<string, number>();
  return rawSegments.map((segment) => {
    if (segment.bucket === null) {
      return { text: segment.text, voiceIndex: 0 };
    }
    let voice = bucketToVoice.get(segment.bucket);
    if (voice === undefined) {
      // 0はナレーター専用なので色には1以降を割り当てる
      voice = 1 + (bucketToVoice.size % (TTS_VOICE_POOL_SIZE - 1));
      bucketToVoice.set(segment.bucket, voice);
    }
    return { text: segment.text, voiceIndex: voice };
  });
}
