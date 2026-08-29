/**
 * timeline.json の型と参照関数。remotion を import しない(scripts/poster.ts など Node からも使う)。
 * ファイルの実体は capture/sim/postprocess.ts が書く。
 */
export interface TimelineEvent {
  t: number;
  name: string;
  phone?: string;
  /** 映像上のフレーム(postprocess が書く)。 */
  frame?: number;
  [key: string]: unknown;
}

export interface Timeline {
  take: string;
  fps: number;
  t0: number;
  phones: Record<string, unknown>;
  events: TimelineEvent[];
  /** 中間ファイル名(phone → ファイル名)。 */
  clips?: Record<string, string>;
  /** 中間ファイルの画素寸法。 */
  clipSize?: { width: number; height: number };
  /** 全面のシーン変化(ポスターフレーム選定用)。 */
  scenes?: Array<{ frame: number; score: number }>;
  sync?: { anchors: Array<{ name: string; frame: number }>; note: string };
}

/** イベントの発生フレーム(撮影の t0 起点・30fps)。 */
export function frameOf(tl: Timeline, name: string): number {
  const ev = tl.events.find((e) => e.name === name);
  if (!ev) throw new Error(`event "${name}" not in timeline ${tl.take}`);
  if (typeof ev.frame === 'number') return ev.frame;
  return Math.round(((ev.t - tl.t0) * tl.fps) / 1000);
}

export function hasEvent(tl: Timeline, name: string): boolean {
  return tl.events.some((e) => e.name === name);
}

export function clipSize(tl: Timeline): { width: number; height: number } {
  return tl.clipSize ?? { width: 1320, height: 2868 };
}

/** 撮影フレーム数(captureStop まで)。 */
export function captureFrames(tl: Timeline): number {
  return frameOf(tl, 'captureStop');
}
