import type { CSSProperties, ReactNode } from 'react';
import { C } from '../lib/theme';

/**
 * ストアスクリーンショット v2(scripts/store/template/slide.html の .device)と同じ意匠の端末フレーム。
 * 黒ベゼル + Dynamic Island + 柔らかい落ち影。寸法は撮影クリップ(iPhone 17 Pro Max 1320×2868)基準で比例させる。
 */
const CLIP_W = 1320;
const CLIP_H = 2868;
/** ベゼル 26px @ 端末幅 972px(1080 幅・端末幅 90%)。角丸 186px・Island 378×111 top 33 は 1320 幅の画面基準。 */
const BEZEL_AT_972 = 26;
const RADIUS_AT_1320 = 186;
const ISLAND = { w: 378, h: 111, top: 33 };

export interface FrameMetrics {
  bezel: number;
  screenW: number;
  screenH: number;
  k: number;
  radius: number;
}

export function frameMetrics(width: number, screenRatio = CLIP_H / CLIP_W): FrameMetrics {
  const bezel = BEZEL_AT_972 * (width / 972);
  const screenW = width - bezel * 2;
  const k = screenW / CLIP_W;
  return { bezel, screenW, screenH: screenW * screenRatio, k, radius: RADIUS_AT_1320 * k };
}

/** フレーム幅から全体の高さを求める(レイアウト計算用)。 */
export function phoneHeight(width: number, screenRatio?: number): number {
  const m = frameMetrics(width, screenRatio);
  return m.screenH + m.bezel * 2;
}

export const PhoneFrame: React.FC<{
  width: number;
  screenRatio?: number;
  style?: CSSProperties;
  children?: ReactNode;
}> = ({ width, screenRatio, style, children }) => {
  const m = frameMetrics(width, screenRatio);
  const shadowScale = width / 972;
  return (
    <div
      style={{
        position: 'relative',
        width,
        height: m.screenH + m.bezel * 2,
        padding: m.bezel,
        boxSizing: 'border-box',
        background: C.bezel,
        borderRadius: m.radius + m.bezel,
        boxShadow: `0 ${43 * shadowScale}px ${97 * shadowScale}px rgba(70,25,10,.38), 0 ${9 * shadowScale}px ${22 * shadowScale}px rgba(70,25,10,.25), inset 0 0 0 1.5px rgba(255,255,255,.12)`,
        ...style,
      }}
    >
      <div style={{ position: 'relative', width: m.screenW, height: m.screenH, borderRadius: m.radius, overflow: 'hidden', background: C.appBar }}>
        {children}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: ISLAND.top * m.k,
            width: ISLAND.w * m.k,
            height: ISLAND.h * m.k,
            translate: '-50% 0',
            background: '#000',
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
};
