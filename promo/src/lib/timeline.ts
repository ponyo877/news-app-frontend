import { staticFile } from 'remotion';
import type { Timeline } from './timeline-core';

export type { Timeline, TimelineEvent } from './timeline-core';
export { captureFrames, clipSize, frameOf, hasEvent } from './timeline-core';

export async function loadTimeline(take: string): Promise<Timeline> {
  const res = await fetch(staticFile(`captures/${take}/timeline.json`));
  if (!res.ok) throw new Error(`timeline not found for take "${take}" (public/captures/${take}/timeline.json)`);
  return (await res.json()) as Timeline;
}

export function clipSrc(tl: Timeline, phone = 'host'): string {
  const file = tl.clips?.[phone] ?? `${phone}.mp4`;
  return staticFile(`captures/${tl.take}/${file}`);
}
