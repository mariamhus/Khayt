import { useEffect, useId, useRef } from "react";
import type { Fabric, Garment, Pattern } from "../lib/api";
import { FOLDS, luminance, shade, SHAPES, tint } from "../lib/garments";

type Props = { garment: Garment; pattern: Pattern; fabric: Fabric; hex: string; className?: string; active?: boolean; title?: string; image?: string | null };

const NOISE: Record<Fabric, { frequency: string; octaves: number; opacity: number }> = {
  cotton: { frequency: "1.4", octaves: 2, opacity: 0.12 },
  linen: { frequency: "0.9 0.28", octaves: 3, opacity: 0.22 },
  silk: { frequency: "0.008 0.05", octaves: 2, opacity: 0.2 },
  denim: { frequency: "0.5 1.6", octaves: 2, opacity: 0.26 },
  wool: { frequency: "0.7", octaves: 4, opacity: 0.26 },
};

export function GarmentArt({ garment, pattern, fabric, hex, className = "", active = false, title, image }: Props) {
  const id = useId().replace(/:/g, "");
  const shape = SHAPES[garment];
  const dark = luminance(hex) < 0.35;
  const accent = dark ? tint(hex, 0.28) : shade(hex, 0.3);
  const contrast = dark ? tint(hex, 0.75) : shade(hex, 0.55);
  const line = dark ? tint(hex, 0.22) : shade(hex, 0.32);
  const noise = NOISE[fabric];
  const displace = useRef<SVGFEDisplacementMapElement>(null);
  const turbulence = useRef<SVGFETurbulenceElement>(null);
  const state = useRef({ value: 0, velocity: 0, frame: 0, target: 0, time: 0 });

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const current = state.current;
    current.target = active ? (image ? 2.5 : 9) : 0;
    if (active) current.velocity += image ? 30 : 90;
    if (current.frame) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      current.time += dt;
      current.velocity += (current.target - current.value) * 60 * dt;
      current.velocity *= Math.exp(-5 * dt);
      current.value += current.velocity * dt;
      displace.current?.setAttribute("scale", current.value.toFixed(2));
      const f = image ? 0.45 : 1;
      turbulence.current?.setAttribute("baseFrequency", `${((0.016 + Math.sin(current.time * 1.7) * 0.004) * f).toFixed(4)} ${((0.03 + Math.cos(current.time * 1.3) * 0.006) * f).toFixed(4)}`);
      if (current.target === 0 && Math.abs(current.value) < 0.05 && Math.abs(current.velocity) < 0.5) {
        displace.current?.setAttribute("scale", "0");
        current.frame = 0;
        current.value = 0;
        current.velocity = 0;
        return;
      }
      current.frame = requestAnimationFrame(tick);
    };
    current.frame = requestAnimationFrame(tick);
  }, [active, image]);

  useEffect(() => {
    const current = state.current;
    return () => {
      if (current.frame) cancelAnimationFrame(current.frame);
      current.frame = 0;
    };
  }, []);

  return (
    <svg viewBox="-8 -8 116 146" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <clipPath id={`${id}c`}>
          <path d={shape.body} />
        </clipPath>
        {pattern === "stripe" && (
          <pattern id={`${id}p`} width="10" height="9" patternUnits="userSpaceOnUse">
            <rect width="10" height="9" fill={hex} />
            <rect width="10" height="3.2" y="1" fill={accent} />
          </pattern>
        )}
        {pattern === "check" && (
          <pattern id={`${id}p`} width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill={dark ? hex : tint(hex, 0.55)} />
            <rect width="6" height="12" fill={dark ? accent : hex} opacity="0.75" />
            <rect width="12" height="6" fill={dark ? accent : hex} opacity="0.75" />
          </pattern>
        )}
        {pattern === "dots" && (
          <pattern id={`${id}p`} width="11" height="11" patternUnits="userSpaceOnUse">
            <rect width="11" height="11" fill={hex} />
            <circle cx="3" cy="3" r="1.5" fill={contrast} />
            <circle cx="8.5" cy="8.5" r="1.5" fill={contrast} />
          </pattern>
        )}
        <filter id={`${id}n`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={noise.frequency} numOctaves={noise.octaves} seed="4" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 1.1" />
        </filter>
        <linearGradient id={`${id}s`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.22" />
          <stop offset="0.3" stopColor="#000" stopOpacity="0" />
          <stop offset="0.72" stopColor="#fff" stopOpacity={fabric === "silk" ? 0.28 : 0.08} />
          <stop offset="1" stopColor="#000" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.2" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}f`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id={`${id}i`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur" />
          <feComposite in="SourceAlpha" in2="blur" operator="out" result="edge" />
          <feFlood floodColor="#000" floodOpacity="0.32" />
          <feComposite in2="edge" operator="in" />
        </filter>
        <filter id={`${id}d`} x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#2a2016" floodOpacity="0.18" />
        </filter>
        <filter id={`${id}r`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence ref={turbulence} type="turbulence" baseFrequency="0.016 0.03" numOctaves="2" seed="7" result="wave" />
          <feDisplacementMap ref={displace} in="SourceGraphic" in2="wave" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      {image ? (
        <g filter={`url(#${id}r)`}>
          <image href={image} x="0" y="0" width="100" height="130" preserveAspectRatio="xMidYMin meet" filter={`url(#${id}d)`} />
        </g>
      ) : (
      <g filter={`url(#${id}r)`}>
        <path d={shape.body} fill={pattern === "solid" ? hex : `url(#${id}p)`} />
        <g clipPath={`url(#${id}c)`}>
          <rect x="0" y="0" width="100" height="130" filter={`url(#${id}n)`} opacity={noise.opacity} style={{ mixBlendMode: dark ? "soft-light" : "multiply" }} />
          <rect x="0" y="0" width="100" height="130" fill={`url(#${id}s)`} />
          {fabric === "silk" && <rect x="0" y="0" width="100" height="130" fill={`url(#${id}g)`} />}
          <g filter={`url(#${id}f)`} fill="none" strokeLinecap="round">
            {FOLDS[garment].dark.map((d) => (
              <path key={d} d={d} stroke="#000" strokeOpacity={fabric === "silk" ? 0.32 : 0.22} strokeWidth="7" />
            ))}
            {FOLDS[garment].light.map((d) => (
              <path key={d} d={d} stroke="#fff" strokeOpacity={fabric === "silk" ? 0.3 : 0.16} strokeWidth="5" />
            ))}
          </g>
        </g>
        <path d={shape.body} filter={`url(#${id}i)`} />
        <g fill="none" stroke={line} strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round">
          {shape.lines.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        {shape.dots.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" fill={contrast} opacity="0.85" />
        ))}
      </g>
      )}
    </svg>
  );
}
