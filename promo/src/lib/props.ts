import { staticFile } from 'remotion';
import type { Timeline } from './timeline-core';

export type AudioFiles = {
  bgm: boolean;
  tap: boolean;
  pop: boolean;
};

export type PromoProps = {
  /** public/captures/<take>/ のテイク名。 */
  take: string;
  hook: boolean;
  endCard: boolean;
  audio: boolean;
  /** calculateMetadata が埋める。 */
  timeline: Timeline | null;
  audioFiles: AudioFiles | null;
};

export type AppStoreProps = {
  take: string;
  audio: boolean;
  timeline: Timeline | null;
  audioFiles: AudioFiles | null;
};

/** public/audio/ に置く音素材(README の台帳。無いものは自動で省略)。 */
export const AUDIO_PATH = {
  bgm: 'audio/bgm.mp3',
  tap: 'audio/sfx-tap.mp3',
  pop: 'audio/sfx-pop.mp3',
} as const;

export function audioSrc(key: keyof typeof AUDIO_PATH): string {
  return staticFile(AUDIO_PATH[key]);
}

export async function probeAudio(): Promise<AudioFiles> {
  const entries = await Promise.all(
    (Object.keys(AUDIO_PATH) as Array<keyof typeof AUDIO_PATH>).map(async (k) => {
      try {
        const res = await fetch(audioSrc(k), { method: 'HEAD' });
        return [k, res.ok] as const;
      } catch {
        return [k, false] as const;
      }
    }),
  );
  return Object.fromEntries(entries) as unknown as AudioFiles;
}
