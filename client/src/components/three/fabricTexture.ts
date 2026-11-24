import * as THREE from "three";
import type { Fabric, Garment, Pattern } from "../../lib/api";
import { FABRIC_FEEL, FOLDS, luminance, shade, SHAPES, tint, VIEW } from "../../lib/garments";

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(width: number, height: number) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  return { element, ctx: element.getContext("2d", { willReadFrequently: true })! };
}

function paint(ctx: CanvasRenderingContext2D, w: number, h: number, pattern: Pattern, fabric: Fabric, hex: string, unit: number) {
  const dark = luminance(hex) < 0.35;
  const accent = dark ? tint(hex, 0.28) : shade(hex, 0.3);
  const contrast = dark ? tint(hex, 0.75) : shade(hex, 0.55);
  ctx.fillStyle = pattern === "check" && !dark ? tint(hex, 0.55) : hex;
  ctx.fillRect(0, 0, w, h);
  if (pattern === "stripe") {
    ctx.fillStyle = accent;
    for (let y = unit; y < h; y += unit * 9) ctx.fillRect(0, y, w, unit * 3.2);
  }
  if (pattern === "check") {
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = dark ? accent : hex;
    for (let x = 0; x < w; x += unit * 12) ctx.fillRect(x, 0, unit * 6, h);
    for (let y = 0; y < h; y += unit * 12) ctx.fillRect(0, y, w, unit * 6);
    ctx.globalAlpha = 1;
  }
  if (pattern === "dots") {
    ctx.fillStyle = contrast;
    for (let y = 0; y < h + unit * 11; y += unit * 11)
      for (let x = 0; x < w + unit * 11; x += unit * 11) {
        ctx.beginPath();
        ctx.arc(x + unit * 3, y + unit * 3, unit * 1.5, 0, Math.PI * 2);
        ctx.arc(x + unit * 8.5, y + unit * 8.5, unit * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
  }
  weave(ctx, w, h, fabric, unit, "color");
}

function weave(ctx: CanvasRenderingContext2D, w: number, h: number, fabric: Fabric, unit: number, mode: "color" | "height") {
  const random = seeded(11);
  const height = mode === "height";
  ctx.lineWidth = Math.max(1, unit * 0.2);
  const stroke = (alpha: number, light: boolean) => {
    ctx.strokeStyle = light ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
  };
  if (fabric === "linen" || fabric === "cotton") {
    const strength = (fabric === "linen" ? 0.1 : 0.04) * (height ? 3 : 1);
    const gap = unit * (fabric === "linen" ? 0.9 : 0.6);
    for (let y = 0; y < h; y += gap) {
      stroke(random() * strength, random() < 0.45);
      ctx.lineWidth = Math.max(1, unit * (fabric === "linen" ? 0.15 + random() * 0.35 : 0.2));
      ctx.beginPath();
      ctx.moveTo(0, y + random() * gap);
      ctx.lineTo(w, y + random() * gap);
      ctx.stroke();
    }
    for (let x = 0; x < w; x += gap) {
      stroke(random() * strength, random() < 0.45);
      ctx.beginPath();
      ctx.moveTo(x + random() * gap, 0);
      ctx.lineTo(x + random() * gap, h);
      ctx.stroke();
    }
  }
  if (fabric === "denim") {
    for (let d = -h; d < w; d += unit * 0.8) {
      stroke((0.05 + random() * 0.1) * (height ? 2.5 : 1), random() < 0.5);
      ctx.beginPath();
      ctx.moveTo(d, 0);
      ctx.lineTo(d + h, h);
      ctx.stroke();
    }
  }
  if (fabric === "wool") {
    for (let i = 0; i < (w * h) / (unit * unit * 0.6); i += 1) {
      const x = random() * w;
      const y = random() * h;
      const angle = random() * Math.PI;
      stroke((0.04 + random() * 0.1) * (height ? 2.5 : 1), random() < 0.5);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * unit * 1.6, y + Math.sin(angle) * unit * 1.6);
      ctx.stroke();
    }
  }
  if (fabric === "silk" && !height) {
    for (let i = 0; i < 7; i += 1) {
      const x = random() * w;
      const band = ctx.createLinearGradient(x - w * 0.12, 0, x + w * 0.12, h * 0.3);
      band.addColorStop(0, "rgba(255,255,255,0)");
      band.addColorStop(0.5, `rgba(255,255,255,${0.06 + random() * 0.1})`);
      band.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = band;
      ctx.fillRect(0, 0, w, h);
    }
  }
}

function folds(ctx: CanvasRenderingContext2D, garment: Garment, scale: number, strength: number) {
  const set = FOLDS[garment];
  ctx.save();
  ctx.scale(scale, scale);
  ctx.lineCap = "round";
  ctx.filter = `blur(${scale * 2.2}px)`;
  ctx.lineWidth = 7;
  ctx.strokeStyle = `rgba(0,0,0,${0.24 * strength})`;
  for (const line of set.dark) ctx.stroke(new Path2D(line));
  ctx.lineWidth = 5;
  ctx.strokeStyle = `rgba(255,255,255,${0.2 * strength})`;
  for (const line of set.light) ctx.stroke(new Path2D(line));
  ctx.restore();
}

function innerShadow(ctx: CanvasRenderingContext2D, body: Path2D, scale: number, strength: number) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.clip(body);
  ctx.filter = `blur(${scale * 2.5}px)`;
  ctx.lineWidth = 6;
  ctx.strokeStyle = `rgba(0,0,0,${0.35 * strength})`;
  ctx.stroke(body);
  ctx.restore();
}

type Built = { map: THREE.CanvasTexture; normal: THREE.CanvasTexture; field: Float32Array; fieldW: number; fieldH: number };

const FIELD_W = 50;
const FIELD_H = 65;

function distanceField(source: HTMLCanvasElement) {
  const { ctx } = canvas(FIELD_W, FIELD_H);
  ctx.drawImage(source, 0, 0, FIELD_W, FIELD_H);
  const pixels = ctx.getImageData(0, 0, FIELD_W, FIELD_H).data;
  const big = 1e6;
  const field = new Float32Array(FIELD_W * FIELD_H);
  for (let i = 0; i < field.length; i += 1) field[i] = pixels[i * 4 + 3]! > 127 ? big : 0;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= FIELD_W || y >= FIELD_H ? 0 : field[y * FIELD_W + x]!);
  for (let y = 0; y < FIELD_H; y += 1)
    for (let x = 0; x < FIELD_W; x += 1) {
      const i = y * FIELD_W + x;
      if (field[i] === 0) continue;
      field[i] = Math.min(field[i]!, at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
    }
  for (let y = FIELD_H - 1; y >= 0; y -= 1)
    for (let x = FIELD_W - 1; x >= 0; x -= 1) {
      const i = y * FIELD_W + x;
      if (field[i] === 0) continue;
      field[i] = Math.min(field[i]!, at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
    }
  let max = 1;
  for (const value of field) max = Math.max(max, value);
  for (let i = 0; i < field.length; i += 1) field[i] = field[i]! / max;
  return field;
}

export function sampleField(built: Pick<Built, "field" | "fieldW" | "fieldH">, u: number, v: number) {
  const x = Math.max(0, Math.min(built.fieldW - 1.001, u * (built.fieldW - 1)));
  const y = Math.max(0, Math.min(built.fieldH - 1.001, v * (built.fieldH - 1)));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const f = built.field;
  const w = built.fieldW;
  const a = f[y0 * w + x0]! * (1 - fx) + f[y0 * w + x0 + 1]! * fx;
  const b = f[(y0 + 1) * w + x0]! * (1 - fx) + f[(y0 + 1) * w + x0 + 1]! * fx;
  return a * (1 - fy) + b * fy;
}

function normalFrom(height: HTMLCanvasElement, strength: number) {
  const w = height.width;
  const h = height.height;
  const source = height.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, w, h).data;
  const { element, ctx } = canvas(w, h);
  const out = ctx.createImageData(w, h);
  const lum = (x: number, y: number) => {
    const cx = Math.max(0, Math.min(w - 1, x));
    const cy = Math.max(0, Math.min(h - 1, y));
    return source[(cy * w + cx) * 4]! / 255;
  };
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const dx = (lum(x + 1, y) - lum(x - 1, y)) * strength;
      const dy = (lum(x, y + 1) - lum(x, y - 1)) * strength;
      const length = Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * w + x) * 4;
      out.data[i] = ((-dx / length) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((dy / length) * 0.5 + 0.5) * 255;
      out.data[i + 2] = ((1 / length) * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  ctx.putImageData(out, 0, 0);
  return element;
}

function texture(element: HTMLCanvasElement, color: boolean) {
  const result = new THREE.CanvasTexture(element);
  if (color) result.colorSpace = THREE.SRGBColorSpace;
  result.anisotropy = 4;
  return result;
}

export function garmentTexture(garment: Garment, pattern: Pattern, fabric: Fabric, hex: string): Built {
  const scale = 5;
  const W = VIEW.w * scale;
  const H = VIEW.h * scale;
  const shape = SHAPES[garment];
  const body = new Path2D(shape.body);
  const feel = FABRIC_FEEL[fabric];
  const { element, ctx } = canvas(W, H);
  ctx.save();
  ctx.scale(scale, scale);
  ctx.clip(body);
  ctx.scale(1 / scale, 1 / scale);
  paint(ctx, W, H, pattern, fabric, hex, scale);
  folds(ctx, garment, scale, fabric === "silk" ? 1.4 : fabric === "denim" ? 0.7 : 1);
  ctx.restore();
  innerShadow(ctx, body, scale, 1);

  const dark = luminance(hex) < 0.35;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.strokeStyle = dark ? tint(hex, 0.22) : shade(hex, 0.32);
  ctx.lineWidth = 0.7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const line of shape.lines) ctx.stroke(new Path2D(line));
  ctx.setLineDash([1.2, 1.1]);
  ctx.lineWidth = 0.35;
  ctx.strokeStyle = dark ? tint(hex, 0.45) : shade(hex, 0.18);
  ctx.save();
  ctx.translate(50, 66);
  ctx.scale(0.955, 0.965);
  ctx.translate(-50, -66);
  ctx.stroke(body);
  ctx.restore();
  ctx.setLineDash([]);
  for (const [x, y] of shape.dots) {
    const button = ctx.createRadialGradient(x - 0.4, y - 0.4, 0.1, x, y, 1.5);
    const base = dark ? tint(hex, 0.75) : shade(hex, 0.55);
    button.addColorStop(0, tint(base, 0.5));
    button.addColorStop(1, base);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.arc(x + 0.3, y + 0.4, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = button;
    ctx.beginPath();
    ctx.arc(x, y, 1.25, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const height = canvas(W, H);
  height.ctx.fillStyle = "#808080";
  height.ctx.fillRect(0, 0, W, H);
  weave(height.ctx, W, H, fabric, scale, "height");
  folds(height.ctx, garment, scale, 1.6);
  height.ctx.save();
  height.ctx.scale(scale, scale);
  height.ctx.lineWidth = 1.4;
  height.ctx.strokeStyle = "rgba(0,0,0,0.6)";
  for (const line of shape.lines) height.ctx.stroke(new Path2D(line));
  height.ctx.restore();

  return { map: texture(element, true), normal: texture(normalFrom(height.element, 2 + feel.weave * 4), false), field: distanceField(element), fieldW: FIELD_W, fieldH: FIELD_H };
}

// Fraction of the plane width the garment's shoulders should cover (hanger bar is ~54%).
const SHOULDER_SPAN = 0.62;
// Gap above the garment so its shoulders meet the hanger bar, not the hook.
const TOP_GAP = 0.035;

/** Trim transparent padding and locate the shoulder line of a cut-out garment photo. */
function garmentBounds(image: HTMLImageElement) {
  const iw = image.naturalWidth;
  const ih = image.naturalHeight;
  const { ctx } = canvas(iw, ih);
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, iw, ih).data;
  const solid = (x: number, y: number) => data[(y * iw + x) * 4 + 3]! > 40;
  const rows: [number, number][] = [];
  let top = -1;
  let bottom = -1;
  let left = iw;
  let right = -1;
  for (let y = 0; y < ih; y += 1) {
    let a = -1;
    let b = -1;
    for (let x = 0; x < iw; x += 1)
      if (solid(x, y)) {
        if (a < 0) a = x;
        b = x;
      }
    rows.push([a, b]);
    if (a < 0) continue;
    if (top < 0) top = y;
    bottom = y;
    left = Math.min(left, a);
    right = Math.max(right, b);
  }
  if (top < 0) return { x: 0, y: 0, w: iw, h: ih, shoulder: iw, center: iw / 2 };
  const w = right - left + 1;
  const h = bottom - top + 1;
  // The garment "starts" at the first row wider than a quarter of its width,
  // skipping stray hanger hooks, tags or a mannequin neck poking out the top.
  let start = top;
  while (start < bottom && rows[start]![1] - rows[start]![0] < w * 0.25) start += 1;
  const probe = rows[Math.min(bottom, start + Math.round(h * 0.06))]!;
  const shoulder = Math.max(probe[1] - probe[0] + 1, w * 0.4);
  return { x: left, y: start, w, h: bottom - start + 1, shoulder, center: (probe[0] + probe[1]) / 2 };
}

export async function photoTexture(url: string, fabric: Fabric): Promise<Built> {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();
  const W = VIEW.w * 6;
  const H = VIEW.h * 6;
  const { element, ctx } = canvas(W, H);
  const box = garmentBounds(image);
  // Size by the shoulder line so every garment spans the hanger the same way,
  // but never let the full silhouette overflow the plane.
  const fit = Math.min((W * SHOULDER_SPAN) / box.shoulder, (W * 0.94) / box.w, (H * (1 - TOP_GAP - 0.02)) / box.h);
  const dw = box.w * fit;
  const dh = box.h * fit;
  ctx.drawImage(image, box.x, box.y, box.w, box.h, W / 2 - (box.center - box.x) * fit, H * TOP_GAP, dw, dh);
  const height = canvas(W, H);
  height.ctx.fillStyle = "#808080";
  height.ctx.fillRect(0, 0, W, H);
  weave(height.ctx, W, H, fabric, 6, "height");
  return { map: texture(element, true), normal: texture(normalFrom(height.element, 1.5), false), field: distanceField(element), fieldW: FIELD_W, fieldH: FIELD_H };
}

export function swatchTexture(pattern: Pattern, fabric: Fabric, hex: string) {
  const size = pattern === "stripe" ? 594 : 396;
  const { element, ctx } = canvas(size, size);
  paint(ctx, size, size, pattern, fabric, hex, 3);
  const map = texture(element, true);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2.5, 2.5);
  const height = canvas(size, size);
  height.ctx.fillStyle = "#808080";
  height.ctx.fillRect(0, 0, size, size);
  weave(height.ctx, size, size, fabric, 3, "height");
  const bump = texture(height.element, false);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(2.5, 2.5);
  return { map, bump };
}

export async function swatchPhoto(url: string) {
  const loaded = await new THREE.TextureLoader().loadAsync(url);
  loaded.colorSpace = THREE.SRGBColorSpace;
  loaded.wrapS = THREE.RepeatWrapping;
  loaded.wrapT = THREE.RepeatWrapping;
  loaded.repeat.set(1.6, 1.6);
  loaded.anisotropy = 4;
  return loaded;
}
