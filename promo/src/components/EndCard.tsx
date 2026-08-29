import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, STAMP_SPRING } from '../lib/theme';
import { BrandBackground, PROPS_END } from './BrandBackground';

/**
 * エンドカード: アイコン・アプリ名・タグライン・ストア名(文字ピル)。
 * 公式バッジ画像は使わない(改変不可の規定と Play の CTA 禁止に触れやすい)。命令形の文言も入れない。
 */
export const EndCard: React.FC<{ name: string; sub: string; tagline: string; width: number; height: number }> = ({ name, sub, tagline, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: STAMP_SPRING, durationInFrames: 18 });
  const p2 = spring({ frame: frame - 8, fps, config: STAMP_SPRING, durationInFrames: 18 });
  const p3 = spring({ frame: frame - 16, fps, config: STAMP_SPRING, durationInFrames: 18 });
  return (
    <BrandBackground width={width} height={height} props={PROPS_END} glowY={height * 0.42}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, fontFamily: FONT.rounded }}>
        <Img
          src={staticFile('brand/icon.png')}
          style={{
            width: 320,
            height: 320,
            borderRadius: '22%',
            boxShadow: '0 30px 60px rgba(70,25,10,.35)',
            opacity: interpolate(p, [0, 1], [0, 1]),
            scale: String(interpolate(p, [0, 1], [0.6, 1])),
          }}
        />
        <div
          style={{
            fontWeight: 900,
            fontSize: 120,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: C.head,
            opacity: interpolate(p2, [0, 1], [0, 1]),
            scale: String(interpolate(p2, [0, 1], [0.7, 1])),
          }}
        >
          {name}
        </div>
        <div style={{ fontWeight: 500, fontSize: 44, color: C.sub, opacity: interpolate(p2, [0, 1], [0, 1]) }}>{sub}</div>
        <div
          style={{
            marginTop: 8,
            background: C.head,
            color: C.peach,
            padding: '12px 40px 16px',
            borderRadius: 999,
            fontWeight: 900,
            fontSize: 56,
            opacity: interpolate(p3, [0, 1], [0, 1]),
            scale: String(interpolate(p3, [0, 1], [0.7, 1])),
          }}
        >
          {tagline}
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 20, opacity: interpolate(p3, [0, 1], [0, 1]) }}>
          {['App Store', 'Google Play'].map((s) => (
            <div
              key={s}
              style={{
                background: 'rgba(255,255,255,.92)',
                color: C.head,
                padding: '14px 36px 18px',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 40,
                boxShadow: '0 10px 30px rgba(70,25,10,.25)',
              }}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    </BrandBackground>
  );
};
