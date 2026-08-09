import { isTag, isText } from 'domhandler';
import type { AnyNode, Element } from 'domhandler';

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
];

// AA(アスキーアート)らしさ: 記号・空白率が高い行は読まない
function looksLikeAsciiArt(text: string): boolean {
  if (text.length < 10) {
    return false;
  }
  const symbolic = text.replace(/[ぁ-んァ-ヶ一-龠a-zA-Z0-9ａ-ｚＡ-Ｚ０-９、。!?!?]/g, '');
  return symbolic.length / text.length > 0.5;
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

// 整形済みHTMLから (テキスト, 色バケット) の列を抽出する。
// テキストノード単位で色を解決し、同色の連続はブロック境界まで結合する
export function buildTtsScript(html: string): TtsSegment[] {
  const $ = loadDoc(html);
  const rawSegments: RawSegment[] = [];
  let currentText = '';
  let currentBucket: string | null = null;

  const flush = () => {
    const text = cleanText(currentText);
    if (text !== '' && !looksLikeAsciiArt(text)) {
      rawSegments.push({ text, bucket: currentBucket });
    }
    currentText = '';
  };

  const walk = (node: AnyNode) => {
    if (isText(node)) {
      const parent = node.parent && isTag(node.parent) ? node.parent : null;
      const bucket = parent ? colorBucket(resolveColor(parent)) : null;
      const piece = node.data ?? '';
      if (piece.trim() !== '') {
        // 色が変わったら話者交代なのでフラッシュ
        if (currentText !== '' && bucket !== currentBucket) {
          flush();
        }
        currentBucket = bucket;
        currentText += piece;
      }
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

  return assignVoices(rawSegments);
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
