import { Video } from '@remotion/media';
import { Sequence } from 'remotion';
import type { Segment } from '../lib/beats';
import { clipSrc, type Timeline } from '../lib/timeline';

/**
 * 撮影クリップをセグメント先頭の sourceFrame から rate 倍速で流す。
 * Sequence の中で使う（Video の内部時計はその Sequence の先頭から進む）。
 * seg.parts があれば、パートごとに撮影フレームを飛ばして繋ぐ（ジャンプカット）。
 */
export const PhoneClip: React.FC<{
  tl: Timeline;
  phone: string;
  seg: Pick<Segment, 'sourceFrame' | 'rate' | 'parts' | 'duration'>;
  width: number;
  height: number;
}> = ({ tl, phone, seg, width, height }) => {
  const parts = seg.parts ?? [{ from: 0, duration: seg.duration, sourceFrame: seg.sourceFrame }];
  return (
    <>
      {parts.map((p) => (
        <Sequence key={`${p.from}-${p.sourceFrame}`} from={p.from} durationInFrames={p.duration} layout="none">
          <Video
            src={clipSrc(tl, phone)}
            trimBefore={Math.max(0, p.sourceFrame)}
            playbackRate={seg.rate}
            muted
            style={{ width, height, display: 'block' }}
          />
        </Sequence>
      ))}
    </>
  );
};
