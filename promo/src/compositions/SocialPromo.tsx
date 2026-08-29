import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BrandBackground, PROPS_SCENE } from '../components/BrandBackground';
import { Headline } from '../components/Caption';
import { EndCard } from '../components/EndCard';
import { HookCard } from '../components/HookCard';
import { PhoneClip } from '../components/PhoneClip';
import { PhoneFrame, frameMetrics } from '../components/PhoneFrame';
import { buildBeats, CAPTIONS, type Segment } from '../lib/beats';
import type { PromoProps } from '../lib/props';
import { C } from '../lib/theme';
import { clipSize, type Timeline } from '../lib/timeline';
import { Soundtrack } from './AppStorePreview';

const W = 1080;
const H = 1920;
/** 端末幅 864(0.8W)・上端 560 → 画面の可視率 ≈ 75%(タブバーと下部を版面外に。スクショ v2 と同じ方針)。 */
const PHONE_W = 864;
const PHONE_TOP = 560;

/** YouTube(Play のプロモ動画)/ X / TikTok 用マスター(1080×1920)。 */
export const SocialPromo: React.FC<PromoProps> = (props) => {
  const tl = props.timeline;
  if (!tl) return <AbsoluteFill style={{ background: C.peach }} />;
  const beats = buildBeats(tl, props);
  const pops = beats.segments
    .filter((s) => s.kind === 'hook' || s.kind === 'end' || s.caption)
    .map((s) => s.from + (s.kind === 'hook' || s.kind === 'end' ? 0 : (s.caption?.delay ?? 4)));
  return (
    <AbsoluteFill style={{ background: C.peach }}>
      {beats.segments.map((seg, i) => (
        <Sequence key={`${seg.kind}-${seg.from}`} name={seg.kind} from={seg.from} durationInFrames={seg.duration} premountFor={20}>
          <SegmentView seg={seg} tl={tl} index={i} />
        </Sequence>
      ))}
      {props.audio && props.audioFiles ? <Soundtrack tl={tl} beats={beats} files={props.audioFiles} volume={0.55} pops={pops} /> : null}
    </AbsoluteFill>
  );
};

const SegmentView: React.FC<{ seg: Segment; tl: Timeline; index: number }> = ({ seg, tl, index }) => {
  switch (seg.kind) {
    case 'hook':
      return <HookCard lines={CAPTIONS.hook.lines} width={W} height={H} />;
    case 'end':
      return <EndCard name={CAPTIONS.end.name} sub={CAPTIONS.end.sub} tagline={CAPTIONS.end.tagline} width={W} height={H} />;
    default:
      return <PhoneScene seg={seg} tl={tl} index={index} />;
  }
};

/** ブランド背景の上に端末 1 台。最初のセグメントだけ下からスライドイン。 */
const PhoneScene: React.FC<{ seg: Segment; tl: Timeline; index: number }> = ({ seg, tl, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = seg.kind === 'ranking';
  const p = enter ? spring({ frame, fps, config: { damping: 16, stiffness: 140 }, durationInFrames: 18 }) : 1;
  const size = clipSize(tl);
  const ratio = size.height / size.width;
  const m = frameMetrics(PHONE_W, ratio);
  const shift = -index * 22;
  return (
    <BrandBackground width={W} height={H} props={PROPS_SCENE} glowY={PHONE_TOP} shift={shift}>
      <div
        style={{
          position: 'absolute',
          left: (W - PHONE_W) / 2,
          top: PHONE_TOP,
          translate: `0px ${interpolate(p, [0, 1], [140, 0])}px`,
          opacity: interpolate(p, [0, 1], [0, 1]),
        }}
      >
        <PhoneFrame width={PHONE_W} screenRatio={ratio}>
          <PhoneClip tl={tl} phone="host" seg={seg} width={m.screenW} height={m.screenH} />
        </PhoneFrame>
      </div>
      {seg.caption ? <Headline lines={seg.caption.lines} sub={seg.caption.sub} delay={seg.caption.delay ?? 4} top={240} width={W} /> : null}
    </BrandBackground>
  );
};
