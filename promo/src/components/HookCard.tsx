import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, STAMP_SPRING } from '../lib/theme';
import { BrandBackground, PROPS_HOOK } from './BrandBackground';

/** 冒頭 1.5 秒のフック。ブランド背景 + 装飾 + 2 行の大きな文字(生成 AI の映像は使わない)。 */
export const HookCard: React.FC<{ lines: readonly string[]; width: number; height: number }> = ({ lines, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p1 = spring({ frame, fps, config: STAMP_SPRING, durationInFrames: 16 });
  const p2 = spring({ frame: frame - 7, fps, config: STAMP_SPRING, durationInFrames: 16 });
  const drift = interpolate(frame, [0, 45], [0, -14]);
  return (
    <BrandBackground width={width} height={height} props={PROPS_HOOK} glowY={height * 0.5} shift={drift}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          fontFamily: FONT.rounded,
          fontWeight: 900,
          fontSize: 104,
          lineHeight: 1.16,
          letterSpacing: '-0.02em',
          color: C.head,
          textShadow: '0 4px 24px rgba(255,255,255,.35)',
        }}
      >
        {lines.map((l, i) => {
          const p = i === 0 ? p1 : p2;
          return (
            <div key={l} style={{ opacity: interpolate(p, [0, 1], [0, 1]), scale: String(interpolate(p, [0, 1], [0.6, 1])) }}>
              {l}
            </div>
          );
        })}
      </div>
    </BrandBackground>
  );
};
