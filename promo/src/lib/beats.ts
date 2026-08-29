/**
 * ストーリーボード(カット割り)。timeline.json の基準点から各セグメントのマスターフレーム位置と、
 * 参照する撮影フレーム・再生速度を決める。
 *
 *   S1 ranking … ランキング → 1 位をタップ                    1.5×
 *   S2 tts     … 記事 → ⋮ → 読み上げ → 追従ハイライト(主役)    1.0×
 *   S3 matsuri … ✕ → 戻る → ホーム → 🔥 → 祭り一覧              1.5×
 *   S4 article … 祭りの 1 件目 → 本文をスクロール               1.25×
 * Social 版は前にフック、後ろにエンドカード。
 */
import { captureFrames, frameOf, hasEvent, type Timeline } from './timeline-core';

export type SegmentKind = 'hook' | 'ranking' | 'tts' | 'matsuri' | 'article' | 'end';

export interface Caption {
  /** 見出し(2 行。App Store 版は連結して 1 行にする)。 */
  lines: readonly string[];
  sub?: string;
  /** セグメント先頭からの遅延(フレーム)。 */
  delay?: number;
}

export interface Part {
  from: number;
  duration: number;
  sourceFrame: number;
}

export interface Segment {
  kind: SegmentKind;
  /** マスター上の開始フレーム。 */
  from: number;
  duration: number;
  /** セグメント先頭で表示する撮影フレーム。映像を使わないセグメントは 0。 */
  sourceFrame: number;
  /** 再生速度。1.5 なら撮影 1.5 フレーム / マスター 1 フレーム。 */
  rate: number;
  caption?: Caption;
  /** 撮影フレームを飛ばして繋ぐ(待ち時間のジャンプカット)。 */
  parts?: Part[];
}

export interface Beats {
  segments: Segment[];
  total: number;
  /** App Store 用のポスターフレーム(マスター上)。読み上げのハイライトが本文へ移った直後。 */
  posterFrame: number;
  /** 撮影フレーム → マスターフレーム(映像が出ていない区間は null)。 */
  sourceToMaster: (src: number) => number | null;
}

export interface BeatOptions {
  hook: boolean;
  endCard: boolean;
}

export const CAPTIONS = {
  hook: { lines: ['通勤中、', 'スレ読む時間ない。'] },
  ranking: { lines: ['今日いちばん', '読まれたスレを、'] },
  tts: { lines: ['読まずに、', '聴く。'], sub: '読んでいる行を追従ハイライト' },
  matsuri: { lines: ['盛り上がってる', 'スレが、わかる。'], sub: '複数のサイトが同じ話題を扱うと自動で検知' },
  article: { lines: ['本文だけが、', 'すっと出る。'], sub: 'Cookieの確認も、重なってくる表示もなし' },
  end: { name: 'まとめくん', sub: '2ch・5chまとめ 読み上げビューア', tagline: '読まずに、聴く。' },
} as const;

export const HOOK_FRAMES = 45;
export const END_FRAMES = 75;

/** 基準点(postprocess の ANCHORS)。映像から見つからなかったときは合図 + 典型遅れで代用する。 */
function anchor(tl: Timeline, name: string, cue: string, lagFrames: number): number {
  if (hasEvent(tl, name)) return frameOf(tl, name);
  return frameOf(tl, cue) + lagFrames;
}

export function buildBeats(tl: Timeline, opts: BeatOptions): Beats {
  const stop = captureFrames(tl);
  const R = anchor(tl, 'rankingShown', 'tapRanking', 18);
  const A1 = anchor(tl, 'article1Opened', 'tapArticle1', 60);
  const T = anchor(tl, 'ttsStarted', 'tapTts', 21);
  const TC = anchor(tl, 'ttsClosed', 'tapTtsClose', 15);
  const C1 = anchor(tl, 'article1Closed', 'tapBack1', 21);
  const H = anchor(tl, 'homeShown', 'tapHome', 18);
  const M = anchor(tl, 'matsuriOpened', 'tapMatsuri', 24);
  const A2 = anchor(tl, 'article2Opened', 'tapArticle2', 60);

  const clamp = (v: number) => Math.max(0, Math.min(stop - 1, Math.round(v)));
  const span = (start: number, end: number, rate: number) => Math.max(1, Math.ceil((end - start) / rate));

  const segs: Segment[] = [];
  let cursor = 0;
  const pushFixed = (kind: SegmentKind, duration: number, caption?: Caption) => {
    segs.push({ kind, from: cursor, duration, sourceFrame: 0, rate: 1 });
    if (caption) segs[segs.length - 1]!.caption = caption;
    cursor += duration;
  };
  /** 複数の撮影区間を 1 セグメントに詰める(区間の間はジャンプカット)。空の区間は捨てる。 */
  const pushParts = (kind: SegmentKind, ranges: Array<[number, number]>, rate: number, caption: Caption) => {
    const parts: Part[] = [];
    let local = 0;
    for (const [s0, e0] of ranges) {
      const start = clamp(s0);
      const end = clamp(e0);
      if (end - start < 4) continue;
      const d = span(start, end, rate);
      parts.push({ from: local, duration: d, sourceFrame: start });
      local += d;
    }
    if (parts.length === 0) return;
    segs.push({ kind, from: cursor, duration: local, sourceFrame: parts[0]!.sourceFrame, rate, caption, parts });
    cursor += local;
  };

  if (opts.hook) pushFixed('hook', HOOK_FRAMES, { ...CAPTIONS.hook });

  // S1: ランキングが出てから 1 位を開くまで。長ければ中(スクロールを戻す区間)を詰める。
  if (A1 + 6 - (R - 12) <= 130) {
    pushParts('ranking', [[R - 12, A1 + 6]], 1.5, { ...CAPTIONS.ranking, delay: 4 });
  } else {
    pushParts('ranking', [[R - 12, R + 48], [A1 - 44, A1 + 6]], 1.5, { ...CAPTIONS.ranking, delay: 4 });
  }

  // S2: 記事を数秒見せてから、⋮ → 読み上げ → バー出現 → タイトルが光る(4 秒)→ [ジャンプ] → 2.0x で本文を追従(〜7.7 秒)。等速。
  // タイトルは長く、速度を切り替えるたびに先頭から読み直すので、本文のハイライトが進むのは開始 7 秒前後から(m2 実測)。
  const articleHold = Math.min(72, Math.max(0, T - 30 - (A1 + 6)));
  const ttsEnd = Math.min(T + 430, TC - 6);
  const ttsSeg = segs.length;
  pushParts('tts', [[A1 + 6, A1 + 6 + articleHold], [T - 24, T + 100], [T + 200, ttsEnd]], 1.0, { ...CAPTIONS.tts });
  // 見出しは読み上げが始まってから出す(⋮ メニューの間は何も被せない)
  const ttsSegment = segs[ttsSeg];
  const ttsLocal = ttsSegment?.parts?.[1] ? ttsSegment.parts[1].from + 24 : 0;
  if (ttsSegment?.caption) ttsSegment.caption.delay = ttsLocal + 8;

  // S3: ✕ → 戻る → ホーム → 🔥 → 祭り一覧(スクロール)。操作は 1.5×。
  pushParts(
    'matsuri',
    [
      [TC - 6, TC + 20],
      [C1 - 14, C1 + 24],
      [H - 10, H + 20],
      [M - 8, M + 150],
    ],
    1.5,
    { ...CAPTIONS.matsuri, delay: 0 },
  );
  const matsuriSeg = segs[segs.length - 1];
  if (matsuriSeg?.kind === 'matsuri' && matsuriSeg.caption && matsuriSeg.parts) {
    const last = matsuriSeg.parts[matsuriSeg.parts.length - 1]!;
    matsuriSeg.caption.delay = last.from + 6;
  }

  // S4: 祭りの 1 件目 → 本文をスクロール。
  pushParts('article', [[A2 - 16, Math.min(A2 + 170, stop - 2)]], 1.25, { ...CAPTIONS.article, delay: 10 });

  if (opts.endCard) pushFixed('end', END_FRAMES);

  const sourceToMaster = (src: number): number | null => {
    for (const s of segs) {
      if (s.kind === 'hook' || s.kind === 'end') continue;
      const parts = s.parts ?? [{ from: 0, duration: s.duration, sourceFrame: s.sourceFrame }];
      for (const p of parts) {
        const end = p.sourceFrame + p.duration * s.rate;
        if (src >= p.sourceFrame && src < end) return s.from + p.from + Math.round((src - p.sourceFrame) / s.rate);
      }
    }
    return null;
  };

  // ポスター: 読み上げ開始の 1 秒後以降で最初のシーン変化(ハイライトが本文へ移って画面が滑った直後)+10f。
  // 読み上げ開始から 4 秒以降(2.0x に切り替えて本文のハイライトが進んでいる頃)で最初のシーン変化、無ければ 6.7 秒後
  const scene = (tl.scenes ?? []).find((c) => c.frame >= T + 120 && c.frame < ttsEnd - 20 && c.score >= 2);
  const posterSrc = scene ? scene.frame + 10 : Math.min(T + 200, ttsEnd - 10);
  const posterFrame = sourceToMaster(posterSrc) ?? sourceToMaster(T + 30) ?? 0;

  return { segments: segs, total: cursor, posterFrame, sourceToMaster };
}

/** App Store プレビュー用(フック・エンドカードなし・15〜30 秒)。 */
export function buildAppStoreBeats(tl: Timeline): Beats {
  return buildBeats(tl, { hook: false, endCard: false });
}
