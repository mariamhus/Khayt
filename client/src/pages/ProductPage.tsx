import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { Check, RotateCcw, ShoppingBag, Truck } from "lucide-react";
import { addToCart, setCartOpen } from "../lib/cart";
import { useI18n } from "../lib/i18n";
import { useReducedMotion, useTitle, webgl } from "../lib/hooks";
import { useProduct } from "../lib/queries";
import { GarmentArt } from "../components/GarmentArt";
import { ProductCard } from "../components/ProductCard";
import { ErrorBox, Spinner } from "../components/ui";

const Drape = lazy(() => import("../components/three/Drape"));

export function ProductPage() {
  const { slug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const query = useProduct(slug);
  const { t, pick, money, fill } = useI18n();
  const reduced = useReducedMotion();
  const [gl] = useState(webgl);
  const [size, setSize] = useState<string | null>(null);
  const [drop, setDrop] = useState(0);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(false);
  const product = query.data?.product;
  useTitle(product ? `${pick(product.name)} · ${t.brand}` : t.brand);

  useEffect(() => {
    setSize(null);
    setAdded(false);
  }, [slug]);

  if (query.isPending) return <Spinner />;
  if (query.isError || !product) return <ErrorBox text={t.product.notFound} />;

  const color = product.colors.find((item) => item.key === params.get("color")) ?? product.colors[0]!;
  const level = (s: string) => product.stock.find((row) => row.color === color.key && row.size === s)?.quantity ?? 0;
  const left = size ? level(size) : 0;
  const soldOut = product.sizes.every((s) => level(s) === 0);

  const add = () => {
    if (!size || left === 0) {
      setError(true);
      return;
    }
    addToCart(product, color, size, 1, left);
    setAdded(true);
    setCartOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-20 sm:px-6">
      <nav className="mb-5 flex gap-2 text-xs text-faint">
        <Link to="/shop" className="hover:text-ink">
          {t.shop.title}
        </Link>
        <span>/</span>
        <Link to={`/shop?category=${product.category}`} className="hover:text-ink">
          {t.category[product.category]}
        </Link>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div className="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-[2rem] bg-card" style={{ background: `radial-gradient(circle at 50% 40%, ${color.hex}22, #fbf8f2 65%)` }}>
            <GarmentArt key={color.key} garment={product.garment} pattern={product.pattern} fabric={product.fabric} hex={color.hex} image={product.images?.[color.key]} className="rise w-[86%]" title={pick(product.name)} />
            {product.compareAt && <span className="absolute top-4 start-4 rounded-full bg-clay px-3 py-1 text-xs font-semibold text-white">{t.shop.sale}</span>}
          </div>
          <div className="relative flex aspect-[4/5] flex-col overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_50%_30%,#fbf8f2,#ece3d3)]">
            <div className="flex items-start justify-between gap-3 p-5 pb-0">
              <div>
                <h2 className="text-sm font-semibold">{t.product.feel}</h2>
                <p className="mt-1 max-w-56 text-xs leading-relaxed text-soft">{t.product.feelText}</p>
              </div>
              <button type="button" onClick={() => setDrop((value) => value + 1)} className="btn-ghost shrink-0 px-3 py-2 text-xs">
                <RotateCcw className="size-3.5" />
                {t.product.drop}
              </button>
            </div>
            <div className="min-h-0 flex-1">
              {gl ? (
                <Suspense fallback={<Spinner label={t.product.loading3d} />}>
                  <Drape fabric={product.fabric} pattern={product.pattern} hex={color.hex} photo={product.swatches?.[color.key] ?? null} reduced={reduced} dropKey={drop} />
                </Suspense>
              ) : (
                <div className="grid h-full place-items-center p-8 text-center text-sm text-soft">{t.fabricNote[product.fabric]}</div>
              )}
            </div>
            <div className="px-5 pb-4 text-center text-xs text-soft">
              <span className="font-semibold text-ink">{t.fabric[product.fabric]}</span> · {t.fabricNote[product.fabric]}
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">{t.fabric[product.fabric]}</p>
          <h1 className="display mt-2 text-4xl sm:text-5xl rtl:text-3xl rtl:sm:text-4xl">{pick(product.name)}</h1>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="num text-2xl font-semibold">{money(product.price)}</span>
            {product.compareAt && <span className="num text-faint line-through">{money(product.compareAt)}</span>}
          </div>
          <p className="mt-5 leading-relaxed text-soft">{pick(product.description)}</p>

          <div className="mt-7">
            <div className="label">
              {t.product.colour}: <span className="text-ink">{pick(color.name)}</span>
            </div>
            <div className="flex gap-2">
              {product.colors.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setParams(option.key === product.colors[0]!.key ? {} : { color: option.key }, { replace: true, preventScrollReset: true });
                    setAdded(false);
                  }}
                  aria-label={pick(option.name)}
                  aria-pressed={option.key === color.key}
                  className={`ring-focus size-10 rounded-full border-2 transition ${option.key === color.key ? "scale-110 border-ink" : "border-white shadow-[0_0_0_1px_#cfc3ae]"}`}
                  style={{ background: option.hex }}
                />
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="label">{t.product.size}</div>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t.product.size}>
              {product.sizes.map((option) => {
                const units = level(option);
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={size === option}
                    disabled={units === 0}
                    onClick={() => {
                      setSize(option);
                      setError(false);
                      setAdded(false);
                    }}
                    className={`ring-focus min-w-14 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:text-faint disabled:line-through ${size === option ? "border-ink bg-ink text-linen" : "border-line-strong hover:border-ink"}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            <p className={`mt-2 h-5 text-xs ${error ? "text-clay" : left > 0 && left <= 3 ? "text-gold" : "text-faint"}`}>{error ? t.product.pick : size ? (left <= 3 ? fill(t.product.left, { n: left }) : t.product.inStock) : ""}</p>
          </div>

          <button type="button" onClick={add} disabled={soldOut} className="btn-clay mt-3 w-full py-4 text-base">
            {added ? <Check className="size-5" /> : <ShoppingBag className="size-5" />}
            {soldOut ? t.product.soldOut : added ? t.product.added : t.product.add}
          </button>

          <div className="mt-6 space-y-3 border-t border-line pt-6 text-sm text-soft">
            <p className="flex gap-3">
              <span className="font-semibold text-ink">{t.product.details}</span>
              {fill(t.product.madeOf, { fabric: t.fabric[product.fabric] })} · {t.pattern[product.pattern]} · {t.garment[product.garment]}
            </p>
            <p className="flex gap-3">
              <Truck className="size-4 shrink-0 text-nile" />
              {t.product.delivery}
            </p>
          </div>
        </div>
      </div>

      {query.data.related.length > 0 && (
        <section className="mt-20">
          <h2 className="display text-3xl sm:text-4xl rtl:text-2xl">{t.product.related}</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
            {query.data.related.map((item, index) => (
              <ProductCard key={item.id} product={item} index={index} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
