import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowDown, ArrowRight, RotateCcw, Truck, Waves } from "lucide-react";
import { CATEGORIES, type Product } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useReducedMotion, useTitle, webgl } from "../lib/hooks";
import { useProducts } from "../lib/queries";
import { GarmentArt } from "../components/GarmentArt";
import { ProductCard } from "../components/ProductCard";
import { Spinner } from "../components/ui";
import type { RailState } from "../components/three/Rail";

const Rail = lazy(() => import("../components/three/Rail"));

function RailHero({ products }: { products: Product[] }) {
  const { t, pick, money, fill, n } = useI18n();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const outer = useRef<HTMLDivElement>(null);
  const state = useRef<RailState>({ progress: 0, hover: null, focus: 0 });
  const [focus, setFocus] = useState(0);
  const [gl] = useState(webgl);
  const product = products[focus] ?? products[0]!;

  useEffect(() => {
    const update = () => {
      const element = outer.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      state.current.progress = range > 0 ? Math.max(0, Math.min(1, -rect.top / range)) : 0;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const jump = (index: number) => {
    const element = outer.current;
    if (!element) return;
    const range = element.offsetHeight - window.innerHeight;
    window.scrollTo({ top: element.offsetTop + (index / Math.max(1, products.length - 1)) * range, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <section ref={outer} style={{ height: gl ? `calc(100dvh + ${(products.length - 1) * 38}vh)` : undefined }} aria-label={t.home.featured}>
      <div className={gl ? "sticky top-0 h-dvh overflow-hidden" : "relative"}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#fbf8f2_0%,#f3eee4_55%,#e9e0d0_100%)]" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pt-24 sm:px-6 sm:pt-28">
          <p className="eyebrow rise">{t.home.eyebrow}</p>
          <h1 className="display rise mt-3 max-w-xl text-5xl leading-[1.02] whitespace-pre-line sm:text-6xl lg:text-7xl rtl:leading-[1.35] rtl:sm:text-5xl rtl:lg:text-6xl" style={{ animationDelay: "60ms" }}>
            {t.home.title}
          </h1>
          <p className="rise mt-4 max-w-md text-[15px] leading-relaxed text-soft max-sm:hidden" style={{ animationDelay: "120ms" }}>
            {t.home.text}
          </p>
        </div>
        {gl ? (
          <>
            <div className="absolute inset-x-0 top-[30%] bottom-0 sm:top-[36%]">
              <Suspense fallback={<Spinner />}>
                <Rail products={products} state={state} onFocus={setFocus} onPick={(index) => navigate(`/p/${products[index]!.slug}`)} reduced={reduced} />
              </Suspense>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-6 sm:px-6 sm:pb-8">
              <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4">
                <div key={product.id} className="rise pointer-events-auto flex items-center gap-4 rounded-3xl border border-line bg-card/90 p-3 pe-5 shadow-[0_20px_60px_-30px_rgba(31,27,23,0.5)] backdrop-blur">
                  <span className="size-10 shrink-0 rounded-full border border-black/10" style={{ background: product.colors[0]!.hex }} />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{pick(product.name)}</div>
                    <div className="text-xs text-soft">
                      {t.fabric[product.fabric]} · <span className="num">{money(product.price)}</span>
                    </div>
                  </div>
                  <Link to={`/p/${product.slug}`} className="btn-dark ms-2 px-4 py-2 text-[13px]">
                    {t.home.view}
                    <ArrowRight className="size-3.5 rtl:-scale-x-100" />
                  </Link>
                </div>
                <div className="pointer-events-auto flex items-center gap-3">
                  <span className="num text-xs text-faint">{fill(t.home.of, { i: n(focus + 1), n: n(products.length) })}</span>
                  <div className="flex gap-1.5">
                    {products.map((item, index) => (
                      <button key={item.id} type="button" onClick={() => jump(index)} aria-label={pick(item.name)} aria-current={index === focus} className={`ring-focus h-1.5 rounded-full transition-all ${index === focus ? "w-6 bg-ink" : "w-1.5 bg-line-strong hover:bg-soft"}`} />
                    ))}
                  </div>
                </div>
              </div>
              {focus === 0 && (
                <p className="mx-auto mt-4 flex max-w-7xl items-center gap-2 text-xs text-faint">
                  <ArrowDown className="size-3.5 animate-bounce" />
                  {t.home.scroll}
                </p>
              )}
            </div>
            <ul className="sr-only">
              {products.map((item) => (
                <li key={item.id}>
                  <Link to={`/p/${item.slug}`}>{pick(item.name)}</Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="no-scrollbar relative z-10 mt-8 flex gap-4 overflow-x-auto px-4 pb-10 sm:px-6">
            {products.map((item) => (
              <Link key={item.id} to={`/p/${item.slug}`} className="ring-focus w-56 shrink-0 rounded-3xl bg-card p-4">
                <GarmentArt garment={item.garment} pattern={item.pattern} fabric={item.fabric} hex={item.colors[0]!.hex} image={item.images?.[item.colors[0]!.key]} className="aspect-[4/5] w-full" />
                <div className="mt-2 truncate text-sm font-semibold">{pick(item.name)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function Home() {
  const { t } = useI18n();
  const featured = useProducts("featured=1");
  const all = useProducts("");
  useTitle(`${t.brand} · ${t.tagline}`);
  const icons = [Waves, Truck, RotateCcw];
  const byCategory = useMemo(() => new Map(CATEGORIES.map((category) => [category, all.data?.find((product) => product.category === category)])), [all.data]);

  return (
    <div className="-mt-16">
      {featured.data && featured.data.length > 0 ? <RailHero products={featured.data} /> : <div className="h-dvh pt-40">{featured.isPending && <Spinner />}</div>}

      <section className="border-y border-line bg-card">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6">
          {t.home.promise.map((item, index) => {
            const Icon = icons[index]!;
            return (
              <div key={item.title} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linen text-clay">
                  <Icon className="size-5" />
                </span>
                <div>
                  <h2 className="font-semibold">{item.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-soft">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="display text-4xl sm:text-5xl rtl:text-3xl rtl:sm:text-4xl">{t.home.categories}</h2>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.filter((category) => byCategory.get(category)).map((category) => {
            const sample = byCategory.get(category);
            return (
              <Link key={category} to={`/shop?category=${category}`} className="ring-focus group relative overflow-hidden rounded-3xl bg-card p-4 transition hover:shadow-[0_24px_60px_-36px_rgba(31,27,23,0.6)]">
                {sample && <GarmentArt garment={sample.garment} pattern={sample.pattern} fabric={sample.fabric} hex={sample.colors[sample.colors.length - 1]!.hex} image={sample.images?.[sample.colors[sample.colors.length - 1]!.key]} className="mx-auto aspect-[4/5] w-4/5 transition duration-500 group-hover:-rotate-3 group-hover:scale-105" />}
                <div className="mt-2 flex items-center justify-between text-sm font-semibold">
                  {t.category[category]}
                  <ArrowRight className="size-4 text-faint transition group-hover:translate-x-1 group-hover:text-clay rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="display text-4xl sm:text-5xl rtl:text-3xl rtl:sm:text-4xl">{t.home.featured}</h2>
          <Link to="/shop" className="btn-ghost">
            {t.home.shopAll}
            <ArrowRight className="size-4 rtl:-scale-x-100" />
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">{(all.data ?? []).filter((product) => !product.featured || product.compareAt).slice(0, 4).map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
      </section>

      <section className="bg-ink text-linen">
        <p className="display mx-auto max-w-4xl px-6 py-20 text-center text-2xl leading-snug sm:text-4xl rtl:text-xl rtl:leading-loose rtl:sm:text-3xl">{t.home.story}</p>
      </section>
    </div>
  );
}
