import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { CATEGORIES, FABRICS } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useTitle } from "../lib/hooks";
import { useMeta, useProducts } from "../lib/queries";
import { ProductCard } from "../components/ProductCard";
import { ErrorBox, Spinner } from "../components/ui";

const SORTS = ["featured", "new", "price_asc", "price_desc"] as const;

export function Shop() {
  const { t, pick, plural } = useI18n();
  const [params, setParams] = useSearchParams();
  const meta = useMeta();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState(false);
  useTitle(`${t.shop.title} · ${t.brand}`);

  const set = (key: string, value: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if ((params.get("q") ?? "") !== search.trim()) set("q", search.trim() || null);
    }, 250);
    return () => window.clearTimeout(timer);
  });

  const query = new URLSearchParams();
  for (const key of ["category", "fabric", "color", "size", "q", "sort"]) if (params.get(key)) query.set(key, params.get(key)!);
  const list = useProducts(query);
  const everything = useProducts("");
  const present = CATEGORIES.filter((item) => !everything.data || everything.data.some((product) => product.category === item));
  const category = params.get("category");
  const active = ["fabric", "color", "size", "q"].filter((key) => params.get(key)).length;
  const chip = (on: boolean) => `ring-focus shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${on ? "border-ink bg-ink text-linen" : "border-line-strong text-soft hover:text-ink"}`;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 pb-20 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl sm:text-6xl rtl:text-4xl rtl:sm:text-5xl">{category && (CATEGORIES as string[]).includes(category) ? t.category[category as (typeof CATEGORIES)[number]] : t.shop.title}</h1>
          <p className="mt-2 text-sm text-soft">{list.data ? plural(t.shop.count, list.data.length) : " "}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-44 sm:w-56">
            <Search className="pointer-events-none absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-faint" />
            <input type="search" className="field ps-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.shop.search} aria-label={t.shop.search} />
          </div>
          <select className="field w-auto" value={params.get("sort") ?? "featured"} onChange={(event) => set("sort", event.target.value === "featured" ? null : event.target.value)} aria-label={t.shop.sort}>
            {SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {t.shop.sorts[sort]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="no-scrollbar -mx-4 mt-6 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <button type="button" className={chip(!category)} onClick={() => set("category", null)}>
          {t.shop.all}
        </button>
        {present.map((item) => (
          <button key={item} type="button" className={chip(category === item)} onClick={() => set("category", item)}>
            {t.category[item]}
          </button>
        ))}
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className={`${chip(open || active > 0)} ms-auto flex items-center gap-2`}>
          <SlidersHorizontal className="size-4" />
          {t.shop.fabric} · {t.shop.colour} · {t.shop.size}
          {active > 0 && <span className="num grid size-5 place-items-center rounded-full bg-clay text-[11px] text-white">{active}</span>}
        </button>
      </div>

      {open && (
        <div className="card rise mt-3 grid gap-5 p-5 md:grid-cols-3">
          <div>
            <div className="label">{t.shop.fabric}</div>
            <div className="flex flex-wrap gap-1.5">
              {FABRICS.map((fabric) => (
                <button key={fabric} type="button" className={chip(params.get("fabric") === fabric)} onClick={() => set("fabric", params.get("fabric") === fabric ? null : fabric)}>
                  {t.fabric[fabric]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="label">{t.shop.colour}</div>
            <div className="flex flex-wrap gap-2">
              {meta.data?.palette.map((color) => (
                <button key={color.key} type="button" title={pick(color.name)} aria-label={pick(color.name)} aria-pressed={params.get("color") === color.key} onClick={() => set("color", params.get("color") === color.key ? null : color.key)} className={`ring-focus size-8 rounded-full border-2 transition ${params.get("color") === color.key ? "scale-110 border-ink" : "border-white shadow-[0_0_0_1px_#cfc3ae]"}`} style={{ background: color.hex }} />
              ))}
            </div>
          </div>
          <div>
            <div className="label">{t.shop.size}</div>
            <div className="flex flex-wrap gap-1.5">
              {meta.data?.sizes.map((size) => (
                <button key={size} type="button" className={chip(params.get("size") === size)} onClick={() => set("size", params.get("size") === size ? null : size)}>
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {list.isPending ? (
        <Spinner />
      ) : list.isError ? (
        <ErrorBox onRetry={() => list.refetch()} />
      ) : list.data.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-soft">{t.shop.empty}</p>
          <button
            type="button"
            className="btn-ghost mt-5"
            onClick={() => {
              setSearch("");
              setParams({}, { replace: true });
            }}
          >
            <X className="size-4" />
            {t.shop.clear}
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
          {list.data.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
