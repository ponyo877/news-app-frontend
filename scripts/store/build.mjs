#!/usr/bin/env node
// ストア用スクリーンショットを合成する(HTML/CSS → Playwright(Chromium) → PNG)。
//
//   node scripts/store/build.mjs                       # 全フォーマット・全スライド
//   node scripts/store/build.mjs --formats play,ios    # フォーマットを絞る(play / ios / ipad / feature)
//   node scripts/store/build.mjs --slides 1,2 --debug  # スライドを絞る。--debug は文字/チップ/画面に枠を描き HTML も out/debug/ に残す
//   node scripts/store/build.mjs --out store-assets/out-try  # 出力先を変える(現行の out/ を残したまま比較するとき)
//
// 素材:
//   store-assets/screens/{android,ios,ipad}/<name>.png … 実画面(必ず本物。AI に描かせない)
//   store-assets/props/<name>.png                      … 透過の装飾(scripts/store/gen-props.py)。無ければ警告して飛ばす
//   フォントは node_modules/@expo-google-fonts/m-plus-rounded-1c(アプリ本文と同じ書体。OFL)
//
// 出力: store-assets/out/<format>-<id>.png と out/manifest.json(文字面積・画面の可視率・フォント検証の記録)
// 出力は ImageMagick でアルファを落とす(ストアはアルファ不可)。
//
// build が失敗する条件(ストア規定と既存方針の機械的な担保):
//   - 見出し/サブに使う文字がフォントに収録されていない(フォールバック混入)
//   - 文字領域が版面の 20% を超える(Play のプロモーション適格条件)
//   - 端末画面の可視率が 86% を超える(タブバー/バナー広告が写る。実画面では広告 ≈87%・タブバー ≈93% から)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { formats, bezelPx, layouts, scene, slides, ipadSlides, feature } from './slides.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const ASSETS = path.join(ROOT, 'store-assets');
const OUT = process.argv.includes('--out') ? path.resolve(process.argv[process.argv.indexOf('--out') + 1]) : path.join(ASSETS, 'out');
const FONT_DIR = path.join(ROOT, 'node_modules/@expo-google-fonts/m-plus-rounded-1c');
const FONTS = [
  { weight: 900, file: '900Black/MPLUSRounded1c_900Black.ttf' },
  { weight: 700, file: '700Bold/MPLUSRounded1c_700Bold.ttf' },
  { weight: 500, file: '500Medium/MPLUSRounded1c_500Medium.ttf' },
];
const BG_TOP = '#FCC3A8';
const MAX_TEXT_AREA = 0.20;
const MAX_VISIBLE = 0.86;  // 記事系は広告が 87% 付近、一覧系はタブバーが 93% 付近から(iOS/iPad/Android とも)

// 元スクリーンショットの端末ごとの寸法(px)。画面の角丸・ノッチは実機の形に合わせる
const FRAME = {
  android: { radius: 130, hole: { d: 56, top: 40 } },
  iphone:  { radius: 186, island: { w: 378, h: 111, top: 33 } },
  ipad:    { radius: 72 },
};

// ---- 引数 -------------------------------------------------------------------
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const DEBUG = args.includes('--debug');
const wantFormats = (opt('--formats') ?? 'play,ios,ipad,feature').split(',');
const wantSlides = opt('--slides')?.split(',').map(Number) ?? null;

// ---- 小道具 -----------------------------------------------------------------
const dataUrl = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
const pngSize = (file) => {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const px = (n) => `${Math.round(n * 100) / 100}px`;

// TTF の cmap を読んで「この文字はフォントに入っているか」を返す(フォールバック混入を build 段階で落とす)
function cmapCoverage(buf) {
  const numTables = buf.readUInt16BE(4);
  let cmap = null;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    if (buf.toString('ascii', rec, rec + 4) === 'cmap') cmap = buf.readUInt32BE(rec + 8);
  }
  if (cmap == null) throw new Error('cmap table not found');
  const n = buf.readUInt16BE(cmap + 2);
  const subs = [];
  for (let i = 0; i < n; i++) {
    const rec = cmap + 4 + i * 8;
    subs.push({ platform: buf.readUInt16BE(rec), encoding: buf.readUInt16BE(rec + 2), offset: cmap + buf.readUInt32BE(rec + 4) });
  }
  const pick = subs.find((s) => s.platform === 3 && s.encoding === 10) ?? subs.find((s) => s.platform === 3 && s.encoding === 1) ?? subs.find((s) => s.platform === 0);
  const off = pick.offset;
  const format = buf.readUInt16BE(off);
  if (format === 12) {
    const groups = buf.readUInt32BE(off + 12);
    const ranges = [];
    for (let g = 0; g < groups; g++) {
      const p = off + 16 + g * 12;
      ranges.push([buf.readUInt32BE(p), buf.readUInt32BE(p + 4), buf.readUInt32BE(p + 8)]);
    }
    return (cp) => ranges.some(([s, e, g]) => cp >= s && cp <= e && g + (cp - s) !== 0);
  }
  if (format === 4) {
    const segX2 = buf.readUInt16BE(off + 6);
    const seg = segX2 / 2;
    const endP = off + 14, startP = endP + segX2 + 2, deltaP = startP + segX2, rangeP = deltaP + segX2;
    return (cp) => {
      for (let i = 0; i < seg; i++) {
        const end = buf.readUInt16BE(endP + i * 2);
        if (cp > end) continue;
        const start = buf.readUInt16BE(startP + i * 2);
        if (cp < start) return false;
        const delta = buf.readInt16BE(deltaP + i * 2);
        const ro = buf.readUInt16BE(rangeP + i * 2);
        if (ro === 0) return ((cp + delta) & 0xffff) !== 0;
        const gp = rangeP + i * 2 + ro + (cp - start) * 2;
        const g = buf.readUInt16BE(gp);
        return g !== 0 && ((g + delta) & 0xffff) !== 0;
      }
      return false;
    };
  }
  throw new Error(`unsupported cmap format ${format}`);
}

const fontBuffers = FONTS.map((f) => ({ ...f, buf: fs.readFileSync(path.join(FONT_DIR, f.file)) }));
const covered = cmapCoverage(fontBuffers[0].buf);
const FONT_CSS = fontBuffers.map((f) =>
  `@font-face { font-family: 'MPLUS Rounded 1c'; font-weight: ${f.weight}; font-style: normal; src: url(data:font/ttf;base64,${f.buf.toString('base64')}) format('truetype'); }`
).join('\n');

function assertGlyphs(text, label) {
  const missing = [...new Set([...text])].filter((ch) => !covered(ch.codePointAt(0)));
  if (missing.length) throw new Error(`${label}: フォントに無い文字 ${JSON.stringify(missing)}(別書体が混ざるので使わない)`);
}

// 装飾・実画面の読み込み(キャッシュ)
const imgCache = new Map();
function image(file) {
  if (!imgCache.has(file)) {
    if (!fs.existsSync(file)) return null;
    imgCache.set(file, { url: dataUrl(file, 'image/png'), ...pngSize(file) });
  }
  return imgCache.get(file);
}
const warned = new Set();
function prop(name) {
  const img = image(path.join(ASSETS, 'props', `${name}.png`));
  if (!img && !warned.has(name)) { warned.add(name); console.warn(`  ⚠ props/${name}.png が無いので飛ばす(gen-props.py で生成して採用する)`); }
  return img;
}
function screen(platform, name) {
  return image(path.join(ASSETS, 'screens', platform, `${name}.png`));
}

// ---- 1枚ぶんの HTML を組む ---------------------------------------------------
function propHtml(p, W, H, shiftX = 0) {
  const img = prop(p.src);
  if (!img) return '';
  const w = p.w * W;
  const h = w * img.h / img.w;
  const cx = (p.x - shiftX) * W, cy = p.y * H;
  if (cx + w / 2 < 0 || cx - w / 2 > W) return '';
  const tf = `rotate(${p.rotate ?? 0}deg)`;
  const z = p.z === 'front' ? 7 : 1;
  return `<div class="prop" style="left:${px(cx - w / 2)};top:${px(cy - h / 2)};width:${px(w)};height:${px(h)};transform:${tf};opacity:${p.opacity ?? 1};z-index:${z}"><img src="${img.url}"></div>`;
}

function deviceGeometry(fmt, raw, src) {
  const { W, H } = fmt;
  // w / x / visible は数値か { play, tall } の帯別指定(縦長版面ほど端末が相対的に短くなるので、tall は大きく・高く置く)
  const band = (v) => (v != null && typeof v === 'object' ? v[fmt.band] : v);
  const spec = { ...raw, w: band(raw.w), x: band(raw.x), visible: band(raw.visible) };
  const deviceW = spec.w * W;
  const bezel = bezelPx[fmt.frame] * (W / 1080) * (spec.w / 0.9);
  const screenW = deviceW - bezel * 2;
  const k = screenW / src.w;
  const screenH = src.h * k;
  const top = H - spec.visible * screenH - bezel;
  const left = spec.x != null ? spec.x * W : (W - deviceW) / 2;
  const radius = FRAME[fmt.frame].radius * k;
  return { deviceW, bezel, screenW, screenH, k, top, left, radius, visible: spec.visible };
}

function deviceHtml(fmt, g, src, z) {
  const f = FRAME[fmt.frame];
  let notch = '';
  if (f.island) notch = `<div class="island" style="top:${px(f.island.top * g.k)};width:${px(f.island.w * g.k)};height:${px(f.island.h * g.k)}"></div>`;
  if (f.hole) notch = `<div class="hole" style="top:${px(f.hole.top * g.k)};width:${px(f.hole.d * g.k)};height:${px(f.hole.d * g.k)}"></div>`;
  return `<div class="device" style="left:${px(g.left)};top:${px(g.top)};width:${px(g.deviceW)};padding:${px(g.bezel)};border-radius:${px(g.radius + g.bezel)};z-index:${z}">
    <div class="screen" style="border-radius:${px(g.radius)};width:${px(g.screenW)};height:${px(g.screenH + 4)}"><img src="${src.url}">${notch}</div></div>`;
}

function chipHtml(fmt, chip, g, src) {
  const rect = chip.rect[fmt.platform];
  if (!rect) return '';
  const [x, y, w, h] = rect;
  const scale = typeof chip.scale === 'object' ? chip.scale[fmt.platform] ?? 1.4 : chip.scale;
  const s = g.k * scale;
  const bw = w * s, bh = h * s;
  const cx = chip.x * fmt.W;
  // 元の要素が端末上で見える位置を中心に置く(拡大ぶんは上下に均等に膨らむ)
  const top = g.top + g.bezel + y * g.k - (bh - h * g.k) / 2 + (chip.dy ?? 0) * fmt.H;
  const radius = 26 * (fmt.W / 1080);
  return `<div class="chip" style="left:${px(cx - bw / 2)};top:${px(top)};width:${px(bw)};height:${px(bh)};border-radius:${px(radius)}">
    <img src="${src.url}" style="width:${px(src.w * s)};left:${px(-x * s)};top:${px(-y * s)}"></div>`;
}

function slideHtml(fmt, slide) {
  const { W, H } = fmt;
  const names = slide.screens ?? [slide.screen];
  const specs = layouts[slide.layout];
  const srcs = names.map((n) => screen(fmt.platform, n));
  if (srcs.some((s) => !s)) return { skip: `screens/${fmt.platform}/{${names.join(',')}}.png が揃っていない` };
  assertGlyphs(slide.head.join('') + slide.sub, `slide ${slide.id}`);

  const geoms = specs.map((spec, i) => deviceGeometry(fmt, spec, srcs[i]));
  const layers = [];
  layers.push(`<div class="glow"></div>`);
  if (slide.panorama != null) layers.push(...scene[fmt.band].map((p) => propHtml(p, W, H, slide.panorama)));
  for (const p of slide.props?.[fmt.band] ?? []) layers.push(propHtml(p, W, H));
  geoms.forEach((g, i) => layers.push(deviceHtml(fmt, g, srcs[i], 2 + (specs[i].z ?? 0))));
  if (slide.chip) layers.push(chipHtml(fmt, slide.chip, geoms[0], srcs[0]));
  layers.push(`<div class="text"><div class="head">${slide.head.map(esc).join('<br>')}</div><br><div class="sub">${esc(slide.sub)}</div></div>`);

  const cssVars = `--W:${W}px;--H:${H}px;--headPx:${fmt.headPx}px;--subPx:${fmt.subPx}px;--textTop:${px(fmt.textTop * H)};--glowTop:${px(geoms[0].top)}`;
  const html = fs.readFileSync(path.join(import.meta.dirname, 'template/slide.html'), 'utf8')
    .replace('{{TITLE}}', `${fmt.platform}-${slide.id}`)
    .replace('{{FONT_CSS}}', FONT_CSS)
    .replace('{{CSS_VARS}}', cssVars)
    .replace('{{BODY_CLASS}}', DEBUG ? 'debug' : '')
    .replace('{{LAYERS}}', layers.join('\n'));
  return { html, geoms };
}

function featureHtml() {
  const { W, H } = feature;
  assertGlyphs(feature.title + feature.lines.join(''), 'feature');
  const layers = [`<div class="glow"></div>`];
  for (const p of feature.props) layers.push(propHtml(p, W, H));
  layers.push(`<div class="text"><div class="title">${esc(feature.title)}</div>${feature.lines.map((l) => `<div class="line">${esc(l)}</div>`).join('')}</div>`);
  const html = fs.readFileSync(path.join(import.meta.dirname, 'template/feature.html'), 'utf8')
    .replace('{{FONT_CSS}}', FONT_CSS)
    .replace('{{CSS_VARS}}', `--W:${W}px;--H:${H}px`)
    .replace('{{BODY_CLASS}}', DEBUG ? 'debug' : '')
    .replace('{{LAYERS}}', layers.join('\n'));
  return { html, geoms: [] };
}

// ---- レンダリング -----------------------------------------------------------
async function render(page, { html, geoms }, W, H, outName) {
  await page.setViewportSize({ width: W, height: H });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await Promise.all([900, 700, 500].map((w) => document.fonts.load(`${w} 40px "MPLUS Rounded 1c"`)));
    await document.fonts.ready;
  });
  const m = await page.evaluate(() => {
    const ok = [900, 500].every((w) => document.fonts.check(`${w} 40px "MPLUS Rounded 1c"`));
    const els = [...document.querySelectorAll('.head,.sub,.title,.line')];
    const rs = els.map((e) => e.getBoundingClientRect());
    const box = rs.length ? {
      left: Math.min(...rs.map((r) => r.left)), top: Math.min(...rs.map((r) => r.top)),
      right: Math.max(...rs.map((r) => r.right)), bottom: Math.max(...rs.map((r) => r.bottom)),
    } : null;
    return { fontsChecked: ok, textBox: box, chips: document.querySelectorAll('.chip').length };
  });
  if (!m.fontsChecked) throw new Error(`${outName}: フォントが読み込めていない`);
  const textArea = m.textBox ? ((m.textBox.right - m.textBox.left) * (m.textBox.bottom - m.textBox.top)) / (W * H) : 0;
  const textBottom = m.textBox ? m.textBox.bottom / H : 0;
  if (m.textBox && m.textBox.right > W) throw new Error(`${outName}: 見出しが版面からはみ出している(1行の文字数を減らす)`);
  // 20% はスクリーンショットのタグラインに対する Play の条件。フィーチャーグラフィックは文字主体なので対象外
  if (geoms.length && textArea > MAX_TEXT_AREA) throw new Error(`${outName}: 文字領域 ${(textArea * 100).toFixed(1)}% が ${MAX_TEXT_AREA * 100}% を超えている`);
  for (const g of geoms) {
    const visible = (H - g.top - g.bezel) / g.screenH;
    if (visible > MAX_VISIBLE) throw new Error(`${outName}: 画面の可視率 ${(visible * 100).toFixed(1)}% が ${MAX_VISIBLE * 100}% を超えている(タブバー/広告が写る)`);
  }

  fs.mkdirSync(OUT, { recursive: true });
  const tmp = path.join(OUT, `.${outName}.rgba.png`);
  const out = path.join(OUT, `${outName}.png`);
  await page.screenshot({ path: tmp, type: 'png', clip: { x: 0, y: 0, width: W, height: H }, scale: 'css', animations: 'disabled' });
  execFileSync('magick', [tmp, '-background', BG_TOP, '-alpha', 'remove', '-alpha', 'off', '-strip', '-define', 'png:color-type=2', out]);
  fs.unlinkSync(tmp);
  if (DEBUG) {
    fs.mkdirSync(path.join(OUT, 'debug'), { recursive: true });
    fs.writeFileSync(path.join(OUT, 'debug', `${outName}.html`), html);
  }
  const rec = {
    file: `${outName}.png`, W, H, textAreaRatio: +textArea.toFixed(4), textBottomRatio: +textBottom.toFixed(4),
    devices: geoms.map((g) => ({ top: Math.round(g.top), visible: +((H - g.top - g.bezel) / g.screenH).toFixed(3), scale: +g.k.toFixed(3) })),
    chips: m.chips, fontsChecked: m.fontsChecked,
  };
  console.log(`  ${outName}.png  文字${(textArea * 100).toFixed(1)}%  可視率 ${rec.devices.map((d) => (d.visible * 100).toFixed(0) + '%').join('/') || '-'}`);
  return rec;
}

async function main() {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'] });
  const ctx = await browser.newContext({ deviceScaleFactor: 1, colorScheme: 'light' });
  const page = await ctx.newPage();
  const manifestPath = path.join(OUT, 'manifest.json');
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
  let failed = 0;
  try {
    for (const key of wantFormats) {
      if (key === 'feature') {
        console.log('feature graphic (1024x500):');
        try {
          manifest['feature-graphic'] = await render(page, featureHtml(), feature.W, feature.H, 'feature-graphic');
        } catch (e) { failed++; console.error(`  ✗ ${e.message}`); }
        continue;
      }
      const fmt = formats[key];
      if (!fmt) throw new Error(`unknown format ${key}`);
      console.log(`${key} (${fmt.W}x${fmt.H}):`);
      const list = slides.filter((s) => (key !== 'ipad' || ipadSlides.includes(s.id)) && (!wantSlides || wantSlides.includes(s.id)));
      for (const slide of list) {
        const name = `${key}-${slide.id}`;
        const built = slideHtml(fmt, slide);
        if (built.skip) { console.log(`  ${name}: スキップ(${built.skip})`); continue; }
        try {
          manifest[name] = await render(page, built, fmt.W, fmt.H, name);
        } catch (e) { failed++; console.error(`  ✗ ${e.message}`); }
      }
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
  if (failed) { console.error(`${failed} 枚が失敗`); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
