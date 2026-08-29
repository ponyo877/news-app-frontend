import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, STAMP_SPRING } from '../lib/theme';

/** スタンプイン(scale 0.7→1・不透明 0→1)。 */
function useStamp(delay: number): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: STAMP_SPRING, durationInFrames: 18 });
}

/**
 * App Store プレビュー用のテロップ。桃色のピルに焦茶の文字(ストア素材と同じコントラスト)。
 * 上部 20% 以内に収める(Play のプロモーション適格条件と同じ基準)。
 */
export const CaptionPill: React.FC<{
  text: string;
  sub?: string;
  delay?: number;
  top?: number;
  width?: number;
}> = ({ text, sub, delay = 6, top = 48, width = 886 }) => {
  const p = useStamp(delay);
  const chars = [...text].length;
  const size = chars > 14 ? 50 : 56;
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 0,
        width,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        opacity: interpolate(p, [0, 1], [0, 1]),
        scale: String(interpolate(p, [0, 1], [0.7, 1])),
      }}
    >
      <div
        style={{
          background: 'rgba(252,195,168,.96)',
          color: C.head,
          padding: '14px 40px 18px',
          borderRadius: 999,
          fontFamily: FONT.rounded,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.15,
          letterSpacing: -0.5,
          whiteSpace: 'nowrap',
          boxShadow: '0 8px 24px rgba(70,25,10,.35)',
        }}
      >
        {text}
      </div>
      {sub ? (
        <div
          style={{
            color: C.white,
            fontFamily: FONT.rounded,
            fontWeight: 700,
            fontSize: 36,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            textShadow: '0 2px 12px rgba(0,0,0,.6), 0 0 2px rgba(0,0,0,.8)',
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
};

/** Social 版の見出し(2 行・ストアスクリーンショットと同じ書体・色・比率)。 */
export const Headline: React.FC<{
  lines: readonly string[];
  sub?: string;
  delay?: number;
  top?: number;
  width?: number;
  size?: number;
  subSize?: number;
}> = ({ lines, sub, delay = 4, top = 240, width = 1080, size = 92, subSize = 44 }) => {
  const p = useStamp(delay);
  const p2 = useStamp(delay + 6);
  return (
    <div style={{ position: 'absolute', top, left: 0, width, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <div
        style={{
          fontFamily: FONT.rounded,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.16,
          letterSpacing: '-0.02em',
          color: C.head,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          opacity: interpolate(p, [0, 1], [0, 1]),
          scale: String(interpolate(p, [0, 1], [0.7, 1])),
        }}
      >
        {lines.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
      {sub ? (
        <div
          style={{
            fontFamily: FONT.rounded,
            fontWeight: 500,
            fontSize: subSize,
            lineHeight: 1.4,
            letterSpacing: '0.01em',
            color: C.sub,
            whiteSpace: 'nowrap',
            opacity: interpolate(p2, [0, 1], [0, 1]),
            translate: `0 ${interpolate(p2, [0, 1], [12, 0])}px`,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
};
