import { Audio } from '@remotion/media';
import { AbsoluteFill, Sequence, interpolate } from 'remotion';
import { CaptionPill } from '../components/Caption';
import { PhoneClip } from '../components/PhoneClip';
import { buildAppStoreBeats, type Beats, type Segment } from '../lib/beats';
import { audioSrc, type AppStoreProps, type AudioFiles } from '../lib/props';
import { C } from '../lib/theme';
import { clipSize, frameOf, hasEvent, type Timeline } from '../lib/timeline';

const W = 886;
const H = 1920;

/**
 * App Store プレビュー(886×1920)。実機映像を全面に、上部にテロップだけ重ねる。
 * 端末フレーム・手・エンドカード・ストアバッジ・URL は入れない(審査ガイドライン)。
 * 撮影クリップ(1320×2868)を高さ基準で 886×1920 に収める(幅は実質そのまま)。
 */
export const AppStorePreview: React.FC<AppStoreProps> = (props) => {
  const tl = props.timeline;
  if (!tl) return <AbsoluteFill style={{ background: C.background }} />;
  const beats = buildAppStoreBeats(tl);
  return (
    <AbsoluteFill style={{ background: C.background }}>
      {beats.segments.map((seg) => (
        <Sequence key={`${seg.kind}-${seg.from}`} name={seg.kind} from={seg.from} durationInFrames={seg.duration} premountFor={20}>
          <FullBleed seg={seg} tl={tl} />
        </Sequence>
      ))}
      {props.audio && props.audioFiles ? <Soundtrack tl={tl} beats={beats} files={props.audioFiles} volume={0.5} /> : null}
    </AbsoluteFill>
  );
};

/** テロップはステータスバー(〜108px)の下、アプリのヘッダー(108〜221px)に重ねる。読み上げバー(237px〜)は隠さない。 */
const CAPTION_TOP = 112;
/** 見出しを見せる長さ。サブ文言があればその後に入れ替える(ピルは常に 1 枚) */
const HEADLINE_FRAMES = 84;

const FullBleed: React.FC<{ seg: Segment; tl: Timeline }> = ({ seg, tl }) => {
  const size = clipSize(tl);
  const width = Math.round((H * size.width) / size.height) + 2;
  const cap = seg.caption;
  const delay = cap?.delay ?? 6;
  const swapAt = delay + HEADLINE_FRAMES;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: Math.round((W - width) / 2), top: 0, width, height: H }}>
        <PhoneClip tl={tl} phone="host" seg={seg} width={width} height={H} />
      </div>
      {cap ? (
        <Sequence from={0} durationInFrames={cap.sub ? swapAt : seg.duration} layout="none">
          <CaptionPill text={cap.lines.join('')} delay={delay} top={CAPTION_TOP} width={W} />
        </Sequence>
      ) : null}
      {cap?.sub ? (
        <Sequence from={swapAt} durationInFrames={Math.max(1, seg.duration - swapAt)} layout="none">
          <CaptionPill text={cap.sub} delay={0} top={CAPTION_TOP} width={W} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

/** 画面が変わる基準点にタップ音を置く(基準点が無ければ合図の時刻)。 */
export const TAP_ANCHORS: Array<[anchor: string, cue: string, offset: number]> = [
  ['article1Opened', 'tapArticle1', -12],
  ['ttsStarted', 'tapTts', -4],
  ['matsuriOpened', 'tapMatsuri', -6],
  ['article2Opened', 'tapArticle2', -12],
];

export function tapFrames(tl: Timeline, beats: Beats): number[] {
  return TAP_ANCHORS.map(([anchor, cue, offset]) => {
    const src = hasEvent(tl, anchor) ? frameOf(tl, anchor) : hasEvent(tl, cue) ? frameOf(tl, cue) + 15 : null;
    return src === null ? null : beats.sourceToMaster(src + offset);
  }).filter((m): m is number => m !== null);
}

/** BGM とタップ音。ファイルが無いものは省く。 */
export const Soundtrack: React.FC<{ tl: Timeline; beats: Beats; files: AudioFiles; volume: number; pops?: number[] }> = ({ tl, beats, files, volume, pops = [] }) => {
  const total = beats.total;
  const taps = files.tap ? tapFrames(tl, beats) : [];
  return (
    <>
      {files.bgm ? (
        <Audio
          src={audioSrc('bgm')}
          volume={(f) => interpolate(f, [0, 20, total - 40, total - 2], [0, volume, volume, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />
      ) : null}
      {taps.map((m, i) => (
        <Sequence key={`tap-${i}-${m}`} from={Math.max(0, m)} durationInFrames={20} layout="none">
          <Audio src={audioSrc('tap')} volume={0.7} />
        </Sequence>
      ))}
      {files.pop
        ? pops.map((m, i) => (
            <Sequence key={`pop-${i}-${m}`} from={Math.max(0, m)} durationInFrames={20} layout="none">
              <Audio src={audioSrc('pop')} volume={0.35} />
            </Sequence>
          ))
        : null}
    </>
  );
};
