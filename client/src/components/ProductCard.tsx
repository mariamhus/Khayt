import { useState } from "react";
import { Link } from "react-router";
import type { Product } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { GarmentArt } from "./GarmentArt";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { t, pick, money } = useI18n();
  const [colour, setColour] = useState(0);
  const [hover, setHover] = useState(false);
  const color = product.colors[colour] ?? product.colors[0]!;
  const to = `/p/${product.slug}${colour ? `?color=${color.key}` : ""}`;
  return (
    <article className="group rise" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
      <Link to={to} className="ring-focus relative block overflow-hidden rounded-3xl bg-card" onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
        <div className="absolute inset-0 opacity-60 transition duration-500 group-hover:opacity-100" style={{ background: `radial-gradient(circle at 50% 38%, ${color.hex}26, transparent 62%)` }} />
        <GarmentArt garment={product.garment} pattern={product.pattern} fabric={product.fabric} hex={color.hex} image={product.images?.[color.key]} active={hover} className="relative mx-auto aspect-[4/5] w-[78%] py-5 transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-[1.04]" title={pick(product.name)} />
        <div className="absolute top-3 start-3 flex gap-1.5">
          {product.inStock === false && <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-linen">{t.shop.soldOut}</span>}
          {product.compareAt && product.inStock !== false && <span className="rounded-full bg-clay px-2.5 py-1 text-[11px] font-semibold text-white">{t.shop.sale}</span>}
        </div>
      </Link>
      <div className="mt-3 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <Link to={to} className="block truncate text-[15px] font-semibold hover:underline" tabIndex={-1}>
            {pick(product.name)}
          </Link>
          <div className="mt-0.5 text-xs text-soft">{t.fabric[product.fabric]}</div>
        </div>
        <div className="shrink-0 text-end">
          <div className="num text-[15px] font-semibold">{money(product.price)}</div>
          {product.compareAt && <div className="num text-xs text-faint line-through">{money(product.compareAt)}</div>}
        </div>
      </div>
      <div className="mt-2 flex gap-1.5 px-1">
        {product.colors.map((option, i) => (
          <button key={option.key} type="button" onClick={() => setColour(i)} aria-label={pick(option.name)} aria-pressed={i === colour} className={`ring-focus size-5 rounded-full border transition ${i === colour ? "border-ink ring-2 ring-linen ring-inset" : "border-black/10"}`} style={{ background: option.hex }} />
        ))}
      </div>
    </article>
  );
}
