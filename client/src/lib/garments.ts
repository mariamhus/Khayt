import type { Fabric, Garment } from "./api";

export const VIEW = { w: 100, h: 130 };

export const SHAPES: Record<Garment, { body: string; lines: string[]; dots: [number, number][] }> = {
  tee: {
    body: "M35 8 Q50 17 65 8 L88 17 L98 40 L83 47 L78 37 L79 122 Q50 127 21 122 L22 37 L17 47 L2 40 L12 17 Z",
    lines: ["M35 8 Q50 21 65 8", "M22 37 L26 20", "M78 37 L74 20"],
    dots: [],
  },
  shirt: {
    body: "M36 6 L50 17 L64 6 L87 14 L98 94 L86 96 L79 42 L80 124 L20 124 L21 42 L14 96 L2 94 L13 14 Z",
    lines: ["M36 6 L44 24 L50 17 L56 24 L64 6", "M50 17 L50 124", "M60 44 L72 44 L72 58 L60 58 Z"],
    dots: [[50, 32], [50, 48], [50, 64], [50, 80], [50, 96], [50, 112]],
  },
  hoodie: {
    body: "M36 10 Q30 2 38 0 Q50 -4 62 0 Q70 2 64 10 L88 18 L98 96 Q92 102 84 98 L80 46 L80 116 Q80 124 72 124 L28 124 Q20 124 20 116 L20 46 L16 98 Q8 102 2 96 L12 18 Z",
    lines: ["M36 10 Q50 26 64 10", "M46 18 L45 40", "M54 18 L55 40", "M30 84 L70 84 L76 104 L24 104 Z", "M20 114 L80 114"],
    dots: [[45, 41], [55, 41]],
  },
  dress: {
    body: "M37 5 Q50 15 63 5 L70 9 L68 36 Q66 47 70 54 L95 123 Q50 131 5 123 L30 54 Q34 47 32 36 L30 9 Z",
    lines: ["M32 44 Q50 51 68 44", "M40 60 L30 122", "M60 60 L70 122", "M50 58 L50 126"],
    dots: [],
  },
  trousers: {
    body: "M23 6 L77 6 L82 124 L57 124 L50 44 L43 124 L18 124 Z",
    lines: ["M23 15 L77 15", "M50 15 L50 44", "M30 15 Q32 28 24 32", "M70 15 Q68 28 76 32", "M34 20 L33 124", "M66 20 L67 124"],
    dots: [[50, 10]],
  },
  jacket: {
    body: "M34 6 L50 14 L66 6 L89 14 L99 97 L86 99 L80 44 L81 122 L19 122 L20 44 L14 99 L1 97 L11 14 Z",
    lines: ["M34 6 L42 34 L50 22 L58 34 L66 6", "M50 22 L50 122", "M27 82 L43 82 L43 104 L27 104 Z", "M57 82 L73 82 L73 104 L57 104 Z", "M58 50 L72 50 L72 64 L58 64 Z"],
    dots: [[53, 44], [53, 62], [53, 80], [53, 98]],
  },
  scarf: {
    body: "M28 6 Q50 0 72 6 L70 118 L56 118 L54 30 Q50 26 46 30 L44 118 L30 118 Z",
    lines: ["M30 118 L30 126", "M34 118 L34 126", "M38 118 L38 126", "M42 118 L42 126", "M58 118 L58 126", "M62 118 L62 126", "M66 118 L66 126", "M70 118 L70 126", "M30 110 L44 110", "M56 110 L70 110"],
    dots: [],
  },
};

export const FOLDS: Record<Garment, { dark: string[]; light: string[] }> = {
  tee: { dark: ["M40 40 Q38 80 41 120", "M62 45 Q64 85 60 120", "M22 38 Q24 30 30 22"], light: ["M50 30 Q52 75 49 118", "M30 50 Q29 90 31 118", "M71 50 Q72 90 70 118"] },
  shirt: { dark: ["M36 44 Q34 90 37 122", "M64 46 Q66 92 62 122", "M12 36 Q9 66 10 92", "M88 36 Q91 66 90 92"], light: ["M44 30 Q45 80 43 120", "M57 30 Q58 82 56 120", "M17 30 Q15 60 15 90", "M84 30 Q86 60 86 90"] },
  hoodie: { dark: ["M38 40 Q36 80 38 112", "M62 40 Q64 80 62 112", "M14 40 Q11 70 9 94", "M86 40 Q89 70 91 94"], light: ["M50 30 Q51 70 50 82", "M28 40 Q26 80 28 110", "M72 40 Q74 80 72 110"] },
  dress: { dark: ["M40 58 Q30 92 22 122", "M58 58 Q66 94 76 124", "M50 60 Q50 95 50 126", "M34 14 Q36 30 34 44"], light: ["M45 60 Q40 95 36 124", "M55 60 Q60 95 63 124", "M28 70 Q20 100 14 120", "M72 70 Q80 100 86 120"] },
  trousers: { dark: ["M32 40 Q30 85 31 122", "M68 40 Q70 85 69 122", "M45 30 Q47 36 50 44"], light: ["M27 30 Q25 80 24 120", "M60 50 Q62 85 61 120", "M40 50 Q42 85 40 120"] },
  jacket: { dark: ["M36 46 Q34 90 37 120", "M64 46 Q66 92 62 120", "M12 36 Q9 66 9 96", "M88 36 Q91 66 91 96"], light: ["M28 30 Q27 80 28 118", "M72 30 Q73 80 72 118", "M17 30 Q15 60 14 94"] },
  scarf: { dark: ["M38 30 Q36 80 37 116", "M62 30 Q64 80 63 116"], light: ["M33 20 Q32 70 33 116", "M67 20 Q68 70 67 116"] },
};

export function mix(hex: string, target: string, amount: number) {
  const parse = (value: string) => [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16));
  const a = parse(hex);
  const b = parse(target);
  return `#${a.map((channel, index) => Math.round(channel + (b[index]! - channel) * amount).toString(16).padStart(2, "0")).join("")}`;
}

export const shade = (hex: string, amount: number) => mix(hex, "#000000", amount);
export const tint = (hex: string, amount: number) => mix(hex, "#ffffff", amount);

export function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const FABRIC_FEEL: Record<Fabric, { weave: number; sheen: number; roughness: number; bend: number; iterations: number; damping: number; friction: number; weight: number }> = {
  cotton: { weave: 0.5, sheen: 0.15, roughness: 0.85, bend: 0.3, iterations: 6, damping: 0.972, friction: 0.12, weight: 3 },
  linen: { weave: 0.9, sheen: 0.05, roughness: 0.95, bend: 0.6, iterations: 8, damping: 0.968, friction: 0.1, weight: 3 },
  silk: { weave: 0.12, sheen: 0.9, roughness: 0.32, bend: 0.04, iterations: 5, damping: 0.986, friction: 0.3, weight: 1 },
  denim: { weave: 0.8, sheen: 0.05, roughness: 0.92, bend: 0.95, iterations: 10, damping: 0.96, friction: 0.06, weight: 5 },
  wool: { weave: 0.65, sheen: 0.3, roughness: 1, bend: 0.45, iterations: 7, damping: 0.965, friction: 0.08, weight: 4 },
};
