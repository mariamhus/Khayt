import { useState } from "react";
import { Link } from "react-router";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { useTitle } from "../../lib/hooks";
import { useStats } from "../../lib/queries";
import { ErrorBox, Spinner } from "../../components/ui";

export default function AdminOverview() {
  const { t, money, fill, n, day, pick } = useI18n();
  const stats = useStats();
  const [hover, setHover] = useState<number | null>(null);
  useTitle(`${t.admin.title} · ${t.brand}`);
  if (stats.isPending) return <Spinner />;
  if (stats.isError) return <ErrorBox onRetry={() => stats.refetch()} />;
  const data = stats.data;
  const max = Math.max(1, ...data.days.map((d) => d.revenue));
  const waiting = (data.statuses.pending ?? 0) + (data.statuses.paid ?? 0);
  const Trend = (data.trend ?? 0) >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="rise">
      <h1 className="display text-4xl sm:text-5xl rtl:text-3xl">{t.admin.overview}</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5">
          <div className="text-sm text-soft">{t.admin.revenue}</div>
          <div className="num mt-2 text-2xl font-semibold">{money(data.revenue)}</div>
          {data.trend !== null && (
            <div className={`mt-1 flex items-center gap-1 text-xs ${data.trend >= 0 ? "text-nile" : "text-clay"}`}>
              <Trend className="size-3.5" />
              {fill(t.admin.trend, { n: (data.trend > 0 ? "+" : "") + n(data.trend) })}
            </div>
          )}
        </div>
        <div className="card p-5">
          <div className="text-sm text-soft">{t.admin.ordersCount}</div>
          <div className="num mt-2 text-2xl font-semibold">{n(data.orders)}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-soft">{t.admin.average}</div>
          <div className="num mt-2 text-2xl font-semibold">{money(data.average)}</div>
        </div>
        <Link to="/admin/orders?status=pending" className={`card ring-focus p-5 transition hover:border-line-strong ${waiting ? "border-gold/40 bg-gold-soft/50" : ""}`}>
          <div className="text-sm text-soft">{t.admin.waiting}</div>
          <div className="num mt-2 text-2xl font-semibold">{n(waiting)}</div>
        </Link>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="card p-5 sm:p-6">
          <h2 className="font-semibold">{t.admin.chart}</h2>
          <div className="relative mt-6 flex h-52 items-end gap-[3px]">
            {data.days.map((d, index) => (
              <div key={d.day} className="relative flex h-full flex-1 items-end" onPointerEnter={() => setHover(index)} onPointerLeave={() => setHover(null)}>
                <div className={`w-full rounded-t-[3px] transition-colors ${hover === index ? "bg-clay" : "bg-ink/80"}`} style={{ height: `${Math.max(1, (d.revenue / max) * 100)}%` }} />
                {hover === index && (
                  <div className="pointer-events-none absolute bottom-full start-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-xs text-linen shadow-lg rtl:translate-x-1/2">
                    <div className="font-semibold">{day(d.day)}</div>
                    <div className="num opacity-80">{money(d.revenue)}</div>
                    <div className="num opacity-80">
                      {t.admin.ordersCount}: {n(d.orders)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-faint">
            <span>{day(data.days[0]!.day)}</span>
            <span>{day(data.days[14]!.day)}</span>
            <span>{day(data.days[29]!.day)}</span>
          </div>
        </div>
        <div className="card p-5 sm:p-6">
          <h2 className="font-semibold">{t.admin.top}</h2>
          <ol className="mt-4 space-y-3">
            {data.top.map((item, index) => (
              <li key={item.slug} className="flex items-center gap-3 text-sm">
                <span className="num grid size-7 shrink-0 place-items-center rounded-full bg-linen text-xs font-semibold text-soft">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{pick(item.name)}</div>
                  <div className="text-xs text-faint">{fill(t.admin.units, { n: n(item.units) })}</div>
                </div>
                <span className="num text-soft">{money(item.revenue)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="card mt-4 p-5 sm:p-6">
        <h2 className="font-semibold">{t.admin.low}</h2>
        {data.lowStock.length === 0 ? (
          <p className="mt-3 text-sm text-faint">{t.admin.lowEmpty}</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {data.lowStock.map((row) => (
              <li key={`${row.productId}${row.color}${row.size}`}>
                <Link to={`/admin/products/${row.productId}`} className="ring-focus flex items-center justify-between gap-3 rounded-2xl bg-linen px-4 py-3 text-sm hover:bg-line/60">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{pick(row.name)}</span>
                    <span className="text-faint">
                      {" "}
                      · {row.color} · {row.size}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.quantity === 0 ? "bg-clay text-white" : "bg-gold-soft text-gold"}`}>{row.quantity === 0 ? t.admin.out : fill(t.admin.left, { n: row.quantity })}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
