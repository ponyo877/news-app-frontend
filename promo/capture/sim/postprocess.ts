/**
 * シミュレータ録画(raw.mov、可変フレームレート)を 30fps CFR の H.264 に変換し、
 * 映像から検出した画面変化を基準点にして、壁時計(cue)→ 映像フレームの対応を作る。
 *
 * simctl recordVideo のタイムスタンプは局所的に 1 割ほど伸び縮みし(Totalizer 実測: 5.7 秒の区間で 0.5 秒)、
 * Maestro の合図も最初のタップは映像より 3 秒以上遅れることがある。壁時計は当てにせず、
 * 撮影順に並ぶ 8 つの画面変化を **領域ごとの平均輝度の段差** で見つけ、区分線形に補間して各イベントに `frame` を書く。
 *
 *   full … 全面。一覧(#303030)⇄ 記事(サイトの白背景)で大きく段差する
 *   bar  … ヘッダー直下(y 12.4〜17.4%)。読み上げバー(#212121)が出ると暗くなる
 *   tab  … タブバー左端(x 0〜20%・y 89〜96%)。ランキング選択で白円が来ると明るくなる
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Timeline, TimelineEvent } from '../timeline';

const FPS = 30;

interface SceneChange {
  frame: number;
  score: number;
}

interface LumaEdge {
  frame: number;
  kind: 'drop' | 'rise';
  delta: number;
}

export interface SyncAnchor {
  name: string;
  /** 壁時計(epoch ms)。合図の受信時刻。 */
  wall: number;
  /** 映像フレーム(30fps)。画面が実際に変わったフレーム。 */
  frame: number;
  score: number;
}

type RegionKey = 'full' | 'bar' | 'tab';
interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

const REGIONS: Record<RegionKey, Region | null> = {
  full: null,
  bar: { x: 0, y: 0.124, w: 1.0, h: 0.05 },
  tab: { x: 0, y: 0.893, w: 0.2, h: 0.066 },
};
/**
 * 撮影順の基準点。時刻の近さではなく **順序** で拾う(録画の時間軸は壁時計より前にも後ろにもずれる: m1 は +1 秒、m2 は −4 秒)。
 *   cue      … 直前に送った合図(壁時計の値に使う)
 *   region   … 見る領域、kind … 段差の向き、minDelta … 段差の最小値(YAVG。--debug で全エッジを見て調整)
 *   minGap   … 直前の基準点からの最小フレーム差
 * 順序: ランキング表示(tab↑) → 記事1(full↑) → ⋮メニュー(bar↓) → 読み上げバー(bar↓) → バーを閉じる(bar↑)
 *       → 記事1を閉じる(full↓) → ホーム(tab↓: ランキングの白円が去る) → 祭り(tab↓: バーが #303030 に) → 記事2(full↑)
 */
const ANCHORS: Array<{ name: string; cue: string; region: RegionKey; kind: 'drop' | 'rise'; minDelta: number; minGap: number }> = [
  { name: 'rankingShown', cue: 'tapRanking', region: 'tab', kind: 'rise', minDelta: 40, minGap: 0 },
  { name: 'article1Opened', cue: 'tapArticle1', region: 'full', kind: 'rise', minDelta: 80, minGap: 30 },
  { name: 'menuOpened', cue: 'tapMenu', region: 'bar', kind: 'drop', minDelta: 30, minGap: 30 },
  { name: 'ttsStarted', cue: 'tapTts', region: 'bar', kind: 'drop', minDelta: 30, minGap: 10 },
  { name: 'ttsClosed', cue: 'tapTtsClose', region: 'bar', kind: 'rise', minDelta: 100, minGap: 90 },
  { name: 'article1Closed', cue: 'tapBack1', region: 'full', kind: 'drop', minDelta: 80, minGap: 10 },
  { name: 'homeShown', cue: 'tapHome', region: 'tab', kind: 'drop', minDelta: 25, minGap: 10 },
  { name: 'matsuriOpened', cue: 'tapMatsuri', region: 'tab', kind: 'drop', minDelta: 25, minGap: 15 },
  { name: 'article2Opened', cue: 'tapArticle2', region: 'full', kind: 'rise', minDelta: 80, minGap: 30 },
];
/** 合図間の壁時計差に対して、映像上の間隔が取りうる上限(録画の伸縮の許容)。 */
const MAX_STRETCH = 1.8;
const MAX_SLACK_FRAMES = 90;

export interface PostprocessOptions {
  debug?: boolean;
}

export function postprocessSim(takeDir: string, outDir: string, opts: PostprocessOptions = {}): Timeline & { sync?: SyncInfo } {
  const raw = join(takeDir, 'raw.mov');
  const timeline = JSON.parse(readFileSync(join(takeDir, 'timeline.json'), 'utf8')) as Timeline & { sync?: SyncInfo; scenes?: SceneChange[] };
  mkdirSync(outDir, { recursive: true });

  // 1) 30fps CFR H.264(Studio でも再生できる)。以降の解析はこのファイルのフレーム番号で行う。
  const clip = 'host.mp4';
  const mp4 = join(outDir, clip);
  execFileSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-i', raw, '-vf', `fps=${FPS}`, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '8', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4],
    { stdio: 'inherit' },
  );
  const probe = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', mp4]).toString().trim();
  const [w, h] = probe.split(',').map(Number);

  // 2) 基準点。
  const edges: Record<RegionKey, LumaEdge[]> = {
    full: detectLumaEdges(mp4, REGIONS.full),
    bar: detectLumaEdges(mp4, REGIONS.bar),
    tab: detectLumaEdges(mp4, REGIONS.tab),
  };
  if (opts.debug) {
    writeFileSync(join(takeDir, 'edges.json'), JSON.stringify(edges, null, 1));
    for (const k of Object.keys(edges) as RegionKey[]) {
      console.log(`[sim] edges ${k}: ${edges[k].map((e) => `${e.frame}${e.kind === 'drop' ? '↓' : '↑'}${e.delta.toFixed(0)}`).join(' ')}`);
    }
  }
  const anchors = findAnchors(timeline, edges);
  const map = buildMapping(timeline.t0, anchors);
  const residuals: Record<string, number> = {};
  for (const ev of timeline.events) {
    const wallFrame = Math.round(((ev.t - timeline.t0) * FPS) / 1000);
    ev.frame = Math.round(map(ev.t));
    if (!(ev.name in residuals)) residuals[ev.name] = ev.frame - wallFrame;
  }
  // 基準点そのものもイベントとして残す(beats.ts は article1Opened 等の名前で参照する)。
  for (const a of anchors) {
    timeline.events.push({ t: a.wall, name: a.name, phone: 'host', frame: a.frame });
  }
  timeline.events.sort((p, q) => (p.frame ?? 0) - (q.frame ?? 0));
  timeline.sync = {
    anchors,
    residuals,
    note: anchors.length
      ? `各イベントの frame は映像基準(${anchors.length}/${ANCHORS.length} 基準点、間は区分線形補間)`
      : '基準点が見つからず録画開始時刻基準(壁時計)。ズレの可能性あり',
  };
  for (const a of anchors) {
    const wallFrame = ((a.wall - timeline.t0) * FPS) / 1000;
    console.log(`[sim] anchor ${a.name.padEnd(16)} frame ${String(a.frame).padStart(5)}  (wall-based ${wallFrame.toFixed(1)}, delta ${a.score.toFixed(1)})`);
  }
  const missing = ANCHORS.filter((a) => !anchors.some((x) => x.name === a.name)).map((a) => a.name);
  if (missing.length) console.warn(`[sim] anchors not found: ${missing.join(', ')}(--debug でエッジを確認し minDelta / minGap を調整)`);

  // 3) ポスターフレーム選定などに使うシーン変化(全面)。
  timeline.scenes = detectSceneChanges(mp4, 2);
  timeline.clips = { host: clip };
  timeline.clipSize = { width: w!, height: h! };
  const json = JSON.stringify(timeline, null, 2);
  writeFileSync(join(takeDir, 'timeline.json'), json);
  writeFileSync(join(outDir, 'timeline.json'), json);
  console.log(`[sim] wrote ${mp4} (${w}x${h}) and timeline.json`);
  return timeline;
}

export interface SyncInfo {
  anchors: SyncAnchor[];
  residuals: Record<string, number>;
  note: string;
}

function eventTime(tl: Timeline, name: string): number | null {
  const ev = tl.events.find((e) => e.name === name);
  return ev?.t ?? null;
}

/** 撮影順に、直前の基準点より後で最初に条件を満たす段差を拾う(壁時計は上限の目安にだけ使う)。 */
function findAnchors(tl: Timeline, edges: Record<RegionKey, LumaEdge[]>): SyncAnchor[] {
  const anchors: SyncAnchor[] = [];
  let prevFrame = 0;
  let prevWall = tl.t0;
  for (const a of ANCHORS) {
    const t = eventTime(tl, a.cue);
    if (t === null) {
      console.warn(`[sim] anchor ${a.name}: cue "${a.cue}" が timeline に無い`);
      continue;
    }
    const wallGap = ((t - prevWall) * FPS) / 1000;
    const maxFrame = prevFrame + wallGap * MAX_STRETCH + MAX_SLACK_FRAMES;
    const cands = edges[a.region]
      .filter((e) => e.kind === a.kind && e.delta >= a.minDelta && e.frame >= prevFrame + a.minGap && e.frame <= maxFrame)
      .sort((p, q) => p.frame - q.frame);
    const pick = cands[0];
    if (!pick) {
      const near = edges[a.region].filter((e) => e.frame > prevFrame && e.frame <= maxFrame + 120);
      console.warn(`[sim] anchor ${a.name}: not found after frame ${prevFrame} (${a.region}: ${near.map((e) => `${e.frame}${e.kind === 'drop' ? '↓' : '↑'}${e.delta.toFixed(0)}`).join(' ') || 'no edges'})`);
      continue;
    }
    anchors.push({ name: a.name, wall: t, frame: pick.frame, score: pick.delta });
    prevFrame = pick.frame;
    prevWall = t;
  }
  return anchors.sort((p, q) => p.wall - q.wall);
}

/** 壁時計 → 映像フレーム。基準点の間は線形補間、外側は実時間の傾きで外挿。 */
export function buildMapping(t0: number, anchors: SyncAnchor[]): (t: number) => number {
  if (anchors.length === 0) return (t) => ((t - t0) * FPS) / 1000;
  return (t) => {
    const first = anchors[0]!;
    if (t <= first.wall) return first.frame + ((t - first.wall) * FPS) / 1000;
    for (let i = 0; i + 1 < anchors.length; i++) {
      const a = anchors[i]!;
      const b = anchors[i + 1]!;
      if (t >= a.wall && t <= b.wall) {
        const r = (t - a.wall) / Math.max(1, b.wall - a.wall);
        return a.frame + r * (b.frame - a.frame);
      }
    }
    const last = anchors[anchors.length - 1]!;
    return last.frame + ((t - last.wall) * FPS) / 1000;
  };
}

/** ffmpeg の scdet でシーン変化(フレーム・スコア)を列挙する。 */
export function detectSceneChanges(file: string, threshold = 5): SceneChange[] {
  const res = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'info', '-i', file, '-vf', `scdet=threshold=${threshold}:sc_pass=1`, '-an', '-f', 'null', '-'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${res.stdout}\n${res.stderr}`;
  const re = /lavfi\.scd\.score:\s*([\d.]+),\s*lavfi\.scd\.time:\s*([\d.]+)/g;
  const found: SceneChange[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(out))) found.push({ score: Number(m[1]), frame: Math.round(Number(m[2]) * FPS) });
  return found;
}

/** 領域(比率指定。null なら全面)の平均輝度の段差を検出する。 */
export function detectLumaEdges(file: string, region: Region | null): LumaEdge[] {
  const crop = region ? `crop=iw*${region.w}:ih*${region.h}:iw*${region.x}:ih*${region.y},` : '';
  const res = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'info', '-i', file, '-vf', `${crop}scale=32:16,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-`, '-an', '-f', 'null', '-'], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  const yavg: number[] = [];
  const re = /lavfi\.signalstats\.YAVG=([\d.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(res.stdout))) yavg.push(Number(m[1]));
  // 前後 6 フレームの平均の差。局所最大を段差とする。
  const W = 6;
  const diff: number[] = new Array(yavg.length).fill(0);
  for (let i = W; i + W < yavg.length; i++) {
    let before = 0;
    let after = 0;
    for (let k = 1; k <= W; k++) {
      before += yavg[i - k]!;
      after += yavg[i + k]!;
    }
    diff[i] = (after - before) / W;
  }
  const edges: LumaEdge[] = [];
  for (let i = W; i + W < yavg.length; i++) {
    const d = diff[i]!;
    if (Math.abs(d) < 8) continue;
    let isMax = true;
    for (let k = -8; k <= 8; k++) {
      if (k !== 0 && Math.abs(diff[i + k] ?? 0) > Math.abs(d)) {
        isMax = false;
        break;
      }
    }
    if (isMax) edges.push({ frame: i, kind: d < 0 ? 'drop' : 'rise', delta: Math.abs(d) });
  }
  return edges;
}

export type { TimelineEvent };
