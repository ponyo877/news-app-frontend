/**
 * iOS シミュレータ上の「まとめくん」を Maestro(flow.yaml)で操作しながら xcrun simctl で録画し、
 * 合図(cue)を timeline.json に記録して postprocess.ts で映像基準に同期する。
 *
 *   前提: EXPO_PUBLIC_ADS_ENV=off で Release ビルドしてシミュレータに入れてある(README)
 *   実行: npm run capture -- --take m1
 *         npm run capture:dry -- --take smoke   (録画せず flow だけ流してセレクタを直す)
 *         --debug を付けると postprocess が輝度エッジを全部ダンプする
 */
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sleep, TimelineLogger } from '../timeline';
import { startCueServer, type CueServer } from './cue-server';
import { postprocessSim } from './postprocess';

const PROMO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const APP_ID = 'com.matomebeta-app';
const SIM_NAME = process.env.PROMO_SIM_NAME ?? 'iPhone 17 Pro Max';
const FPS = 30;
const CUE_PORT = 8790;
const MAESTRO_ENV = { ...process.env, PATH: `${process.env.HOME}/.maestro/bin:${process.env.PATH ?? ''}` };

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}

function flag(name: string): boolean {
  return process.argv.includes(name);
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

interface SimDevice {
  udid: string;
  name: string;
  state: string;
}

/** 名前完全一致でシミュレータを選び、止まっていれば起動する。PROMO_SIM_UDID があればそれを使う。 */
function ensureDevice(): SimDevice {
  const json = JSON.parse(execFileSync('xcrun', ['simctl', 'list', 'devices', 'available', '-j']).toString()) as {
    devices: Record<string, SimDevice[]>;
  };
  const all = Object.values(json.devices).flat();
  const wantUdid = process.env.PROMO_SIM_UDID;
  const pick = wantUdid ? all.find((d) => d.udid === wantUdid) : all.find((d) => d.name === SIM_NAME);
  if (!pick) throw new Error(`シミュレータ "${wantUdid ?? SIM_NAME}" が見つかりません(xcrun simctl list devices available)`);
  if (pick.state !== 'Booted') {
    console.log(`[sim] booting ${pick.name}`);
    execFileSync('xcrun', ['simctl', 'boot', pick.udid], { stdio: 'ignore' });
    execFileSync('open', ['-a', 'Simulator'], { stdio: 'ignore' });
    execFileSync('xcrun', ['simctl', 'bootstatus', pick.udid, '-b'], { stdio: 'ignore' });
  }
  console.log(`[sim] device: ${pick.name} (${pick.udid})`);
  return pick;
}

/** 9:41・Wi-Fi・電波フル・電池 100%(store-assets/README.md のスクショ撮影と同じ)。 */
function overrideStatusBar(udid: string): void {
  try {
    execFileSync(
      'xcrun',
      ['simctl', 'status_bar', udid, 'override', '--time', '9:41', '--dataNetwork', 'wifi', '--wifiMode', 'active', '--wifiBars', '3', '--cellularMode', 'active', '--cellularBars', '4', '--operatorName', '', '--batteryState', 'discharging', '--batteryLevel', '100'],
      { stdio: 'ignore' },
    );
  } catch {
    console.warn('[sim] status_bar override は無視されました(実物のステータスバーのまま。偽のバーは合成しない)');
  }
}

async function main(): Promise<void> {
  const take = arg('--take', `m-${stamp()}`);
  const noRecord = flag('--no-record');
  const debug = flag('--debug');
  const takeDir = join(PROMO_ROOT, 'captures', take);
  const outDir = join(PROMO_ROOT, 'public', 'captures', take);
  mkdirSync(takeDir, { recursive: true });

  const device = ensureDevice();
  const udid = device.udid;
  try {
    execFileSync('xcrun', ['simctl', 'get_app_container', udid, APP_ID], { stdio: 'ignore' });
  } catch {
    throw new Error(`${APP_ID} がシミュレータに入っていません(README: EXPO_PUBLIC_ADS_ENV=off npx expo run:ios ...)`);
  }
  overrideStatusBar(udid);

  const log = new TimelineLogger(take, FPS);
  const cue: CueServer = await startCueServer(CUE_PORT);
  let recorder: ChildProcess | null = null;
  let maestro: ChildProcess | null = null;
  let mirror: ReturnType<typeof setInterval> | null = null;
  try {
    const flow = join(PROMO_ROOT, 'capture', 'sim', 'flow.yaml');
    maestro = spawn('maestro', ['--device', udid, 'test', flow], { stdio: 'inherit', env: MAESTRO_ENV });
    const maestroExit = new Promise<number>((resolve) => maestro!.on('exit', (code) => resolve(code ?? 1)));

    // 合図を timeline に写す(受信時刻そのものを使う)。
    const seen = new Set<number>();
    mirror = setInterval(() => {
      for (const c of cue.cues) {
        if (seen.has(c.t)) continue;
        seen.add(c.t);
        if (c.event !== 'ready') log.events.push({ t: c.t, name: c.event, phone: 'host' });
      }
    }, 20);

    await cue.waitFor('ready', 120000);
    overrideStatusBar(udid);
    const rawPath = join(takeDir, 'raw.mov');
    if (!noRecord) {
      recorder = spawn('xcrun', ['simctl', 'io', udid, 'recordVideo', '--codec', 'h264', '--mask', 'ignored', '--force', rawPath], {
        stdio: ['ignore', 'inherit', 'inherit'],
      });
      console.log(`[sim] recording → ${rawPath}`);
    }
    log.start();

    await cue.waitFor('captureStop', 240000);
    await sleep(1500);
    clearInterval(mirror);
    mirror = null;
    if (recorder) {
      recorder.kill('SIGINT');
      await new Promise<void>((resolve) => recorder!.on('exit', () => resolve()));
      recorder = null;
    }
    const code = await maestroExit;
    if (code !== 0) console.warn(`[sim] maestro exited with ${code}`);

    log.write(join(takeDir, 'timeline.json'));
    if (noRecord) {
      console.log(`[sim] dry run OK: ${log.events.map((e) => e.name).join(' → ')}`);
      return;
    }
    const tl = postprocessSim(takeDir, outDir, { debug });
    console.log(`[sim] take ${take} OK: ${tl.sync?.anchors.length ?? 0} anchors, ${tl.events.length} events`);
  } finally {
    if (mirror) clearInterval(mirror);
    recorder?.kill('SIGINT');
    maestro?.kill();
    cue.close();
    try {
      execFileSync('xcrun', ['simctl', 'status_bar', udid, 'clear'], { stdio: 'ignore' });
    } catch {
      // 無視。
    }
  }
}

main().catch((e: Error) => {
  console.error(`[sim] FAILED: ${e.message}`);
  process.exit(1);
});
