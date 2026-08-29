import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** 撮影中に観測したイベント。t は epoch ms（全端末・全ボットで同じ時計）。 */
export interface TimelineEvent {
  t: number;
  name: string;
  phone?: string;
  /** 映像上のフレーム（シミュレータ経路で postprocess が書く。無ければ t0 から計算）。 */
  frame?: number;
  [key: string]: unknown;
}

export interface PhoneStats {
  raw: number;
  avgFps: number;
  maxGapMs: number;
  /** 撮影開始（screencast 開始）時刻。 */
  startedAt: number;
}

export interface Timeline {
  take: string;
  fps: number;
  t0: number;
  phones: Record<string, PhoneStats>;
  events: TimelineEvent[];
  /** テイク終了時の開票結果（検証用）。 */
  result?: { yes: number; no: number; winner: string; verdict: string };
  /** 中間ファイル名（phone → ファイル名）。retime.ts / postprocess.ts が書く。 */
  clips?: Record<string, string>;
  /** 中間ファイルの画素寸法（全端末共通）。 */
  clipSize?: { width: number; height: number };
}

/** イベントを壁時計で記録し、timeline.json に書き出す。 */
export class TimelineLogger {
  t0: number | null = null;
  readonly events: TimelineEvent[] = [];
  readonly phones: Record<string, PhoneStats> = {};
  result: Timeline['result'];

  constructor(
    readonly take: string,
    readonly fps: number,
  ) {}

  start(): number {
    this.t0 = Date.now();
    this.mark('captureStart');
    return this.t0;
  }

  mark(name: string, meta: Omit<TimelineEvent, 't' | 'name'> = {}): TimelineEvent {
    const ev: TimelineEvent = { t: Date.now(), name, ...meta };
    this.events.push(ev);
    return ev;
  }

  /** 同名イベントの最初の観測時刻（端末指定があればその端末のもの）。 */
  timeOf(name: string, phone?: string): number | null {
    const ev = this.events.find((e) => e.name === name && (phone ? e.phone === phone : true));
    return ev?.t ?? null;
  }

  /** イベント到着を待つ（ポーリング）。 */
  async waitFor(name: string, timeoutMs: number, phone?: string): Promise<number> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const t = this.timeOf(name, phone);
      if (t !== null) return t;
      if (Date.now() > deadline) {
        throw new Error(`timed out waiting for "${name}" (${this.events.map((e) => e.name).join(', ')})`);
      }
      await sleep(10);
    }
  }

  toJSON(): Timeline {
    if (this.t0 === null) throw new Error('timeline not started');
    return {
      take: this.take,
      fps: this.fps,
      t0: this.t0,
      phones: this.phones,
      events: [...this.events].sort((a, b) => a.t - b.t),
      result: this.result,
    };
  }

  write(path: string): void {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(this.toJSON(), null, 2));
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, Math.max(0, ms)));
}

/** t0 基準の絶対時刻まで待つ（連鎖 sleep にせず、ドリフトを溜めない）。 */
export async function waitUntil(t0: number, atMs: number): Promise<void> {
  const remaining = t0 + atMs - Date.now();
  if (remaining > 0) await sleep(remaining);
}
