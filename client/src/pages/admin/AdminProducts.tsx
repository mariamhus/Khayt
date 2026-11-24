import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { useTitle } from "../../lib/hooks";
import { useAdminProducts } from "../../lib/queries";
import { GarmentArt } from "../../components/GarmentArt";
import { ErrorBox, Spinner } from "../../components/ui";

export default function AdminProducts() {
  const { t, pick, money, fill, n } = useI18n();
  const list = useAdminProducts();
  useTitle(`${t.admin.products} · ${t.brand}`);
  return (
    <div className="rise">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-4xl sm:text-5xl rtl:text-3xl">{t.admin.products}</h1>
        <Link to="/admin/products/new" className="btn-clay">
          <Plus className="size-4" />
          {t.admin.add}
        </Link>
      </div>
      {list.isPending ? (
        <Spinner />
      ) : list.isError ? (
        <ErrorBox onRetry={() => list.refetch()} />
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.data.map((product) => (
            <li key={product.id}>
              <Link to={`/admin/products/${product.id}`} className={`card ring-focus flex items-center gap-4 p-3 transition hover:border-line-strong ${product.active ? "" : "opacity-55"}`}>
                <span className="grid h-24 w-20 shrink-0 place-items-center rounded-2xl bg-linen">
                  <GarmentArt garment={product.garment} pattern={product.pattern} fabric={product.fabric} hex={product.colors[0]!.hex} image={product.images?.[product.colors[0]!.key]} className="h-20" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{pick(product.name)}</div>
                  <div className="num text-sm text-soft">{money(product.price)}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${product.active ? "bg-nile-soft text-nile" : "bg-black/[0.06] text-faint"}`}>{product.active ? t.admin.live : t.admin.hidden}</span>
                    <span className={product.stock === 0 ? "font-semibold text-clay" : "text-faint"}>{product.stock === 0 ? t.admin.out : fill(t.admin.inStock, { n: n(product.stock) })}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
