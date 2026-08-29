import { AbsoluteFill, Img, staticFile } from 'remotion';
import { GRADIENT } from '../lib/theme';

/** 装飾の配置(1080×1920 の版面に対する割合。scripts/store/slides.mjs の scene.play と同じ置き方)。 */
export interface Prop {
  src: 'bubble-big' | 'bubble-cluster' | 'sound-rings' | 'flame' | 'crown-sparkles';
  x: number;
  y: number;
  w: number;
  rotate?: number;
  opacity?: number;
}

export const PROPS_HOOK: Prop[] = [
  { src: 'sound-rings', x: 0.5, y: 0.5, w: 1.6, opacity: 0.55 },
  { src: 'bubble-big', x: 0.16, y: 0.2, w: 0.34, rotate: -14 },
  { src: 'bubble-cluster', x: 0.84, y: 0.78, w: 0.42, rotate: 8 },
  { src: 'flame', x: 0.86, y: 0.22, w: 0.18, rotate: 10 },
];

export const PROPS_SCENE: Prop[] = [
  { src: 'sound-rings', x: 0.5, y: 0.62, w: 1.3, opacity: 0.7 },
  { src: 'bubble-big', x: 0.085, y: 0.08, w: 0.13, rotate: -14 },
  { src: 'bubble-cluster', x: 0.905, y: 0.165, w: 0.17, rotate: 8 },
];

export const PROPS_END: Prop[] = [
  { src: 'sound-rings', x: 0.5, y: 0.42, w: 1.5, opacity: 0.5 },
  { src: 'bubble-cluster', x: 0.14, y: 0.16, w: 0.3, rotate: -10 },
  { src: 'bubble-big', x: 0.86, y: 0.2, w: 0.22, rotate: 12 },
  { src: 'flame', x: 0.12, y: 0.82, w: 0.16, rotate: -8 },
  { src: 'crown-sparkles', x: 0.87, y: 0.8, w: 0.2, rotate: 8 },
];

/**
 * ブランド背景: コーラルのグラデ + 白いグロー + 透過の装飾 PNG(store-assets/props)。
 * shift で装飾だけを横にずらせる(セグメント間の視差)。
 */
export const BrandBackground: React.FC<{
  width: number;
  height: number;
  props?: Prop[];
  /** グローの中心 y(px)。端末の上端に合わせる。 */
  glowY?: number;
  shift?: number;
  children?: React.ReactNode;
}> = ({ width, height, props = [], glowY, shift = 0, children }) => {
  const glowSize = width * 1.5;
  return (
    <AbsoluteFill style={{ background: GRADIENT, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: width / 2 - glowSize / 2,
          top: (glowY ?? height * 0.55) - glowSize * 0.4,
          width: glowSize,
          height: glowSize,
          background: 'radial-gradient(closest-side, rgba(255,255,255,.42), rgba(255,255,255,0))',
        }}
      />
      {props.map((p, i) => {
        const w = p.w * width;
        return (
          <Img
            key={`${p.src}-${i}`}
            src={staticFile(`props/${p.src}.png`)}
            style={{
              position: 'absolute',
              left: p.x * width - w / 2 + shift,
              top: p.y * height - w / 2,
              width: w,
              height: w,
              rotate: `${p.rotate ?? 0}deg`,
              opacity: p.opacity ?? 1,
            }}
          />
        );
      })}
      {children}
    </AbsoluteFill>
  );
};
