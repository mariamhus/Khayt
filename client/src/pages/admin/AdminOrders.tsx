import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { api, ApiError, STATUSES, type Order, type OrderStatus } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { useTitle } from "../../lib/hooks";
import { useAdminOrders, useOrder } from "../../lib/queries";
import { ErrorBox, Modal, Spinner, StatusBadge } from "../../components/ui";

function OrderDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { t, pick, money, date } = useI18n();
  const query = useOrder(id);
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (query.isPending) return <Spinner />;
  if (query.isError) return <ErrorBox />;
  const order = query.data;
  const change = async (status: OrderStatus) => {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ order: Order }>(`/admin/orders/${id}/status`, { method: "PUT", body: { status } });
      client.setQueryData(["order", id], result.order);
      client.invalidateQueries({ queryKey: ["admin"] });
    } catch (failure) {
      setError((t.admin.errors as Record<string, string>)[failure instanceof ApiError ? failure.code : ""] ?? t.common.error);
    }
    setBusy(false);
  };
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-soft">{date(order.createdAt)}</div>
        <StatusBadge status={order.status} />
      </div>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3 py-2.5 text-sm">
            <span>
              {pick(item.name)} <span className="text-faint">· {item.color} · {item.size} · × {item.quantity}</span>
            </span>
            <span className="num">{money(item.unitPrice * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-between text-sm font-semibold">
        <span>{t.cart.total}</span>
        <span className="num">{money(order.total)}</span>
      </div>
      <div className="mt-4 rounded-2xl bg-linen p-4 text-sm">
        <div className="font-medium">{order.customerName}</div>
        <div className="text-soft">
          {order.address}, {order.city}
        </div>
        <div className="text-soft" dir="ltr" style={{ textAlign: "start" }}>
          {order.phone}
        </div>
        <div className="mt-1 text-xs text-faint">{order.payment === "card" ? t.checkout.card : t.checkout.cod}</div>
      </div>
      <div className="mt-5">
        <div className="label">{t.admin.status}</div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <button key={status} type="button" disabled={busy || order.status === "cancelled" || status === order.status} onClick={() => change(status)} className={`ring-focus rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${status === order.status ? "border-ink bg-ink text-linen" : status === "cancelled" ? "border-clay/40 text-clay hover:bg-clay-soft" : "border-line-strong hover:border-ink"}`}>
              {t.status[status]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-faint">{t.admin.cancelNote}</p>
        {error && <p className="mt-2 text-sm text-clay">{error}</p>}
      </div>
      <div className="mt-5 text-end">
        <button type="button" onClick={onClose} className="btn-ghost">
          {t.common.close}
        </button>
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const { t, money, date, fill, n, dir } = useI18n();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState<{ id: string; number: string } | null>(null);
  useTitle(`${t.admin.orders} · ${t.brand}`);
  const status = (["all", ...STATUSES] as string[]).includes(params.get("status") ?? "") ? params.get("status")! : "all";
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if ((params.get("q") ?? "") === search.trim()) return;
      setParams((current) => {
        const next = new URLSearchParams(current);
        if (search.trim()) next.set("q", search.trim());
        else next.delete("q");
        next.delete("page");
        return next;
      }, { replace: true });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, params, setParams]);
  const query = new URLSearchParams({ status, page: String(page) });
  if (params.get("q")) query.set("q", params.get("q")!);
  const list = useAdminOrders(query);
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;
  const set = (key: string, value: string | null) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });
  const Prev = dir === "rtl" ? ChevronRight : ChevronLeft;
  const Next = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <div className="rise">
      <h1 className="display text-4xl sm:text-5xl rtl:text-3xl">{t.admin.orders}</h1>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-faint" />
          <input type="search" className="field ps-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.admin.search} aria-label={t.admin.search} />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {["all", ...STATUSES].map((value) => (
            <button key={value} type="button" onClick={() => set("status", value === "all" ? null : value)} className={`ring-focus shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${value === status ? "bg-ink text-linen" : "text-soft hover:bg-black/[0.05]"}`}>
              {value === "all" ? t.admin.all : t.status[value as OrderStatus]}
            </button>
          ))}
        </div>
      </div>
      {list.isPending ? (
        <Spinner />
      ) : list.isError ? (
        <ErrorBox onRetry={() => list.refetch()} />
      ) : list.data.orders.length === 0 ? (
        <p className="py-16 text-center text-soft">{t.admin.noOrders}</p>
      ) : (
        <>
          <div className="card mt-4 overflow-hidden">
            <ul className="divide-y divide-line">
              {list.data.orders.map((order) => (
                <li key={order.id}>
                  <button type="button" onClick={() => setOpen({ id: order.id, number: order.number })} className="ring-focus grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 text-start text-sm transition hover:bg-linen sm:grid-cols-[7rem_1fr_8rem_7rem_7rem]">
                    <span className="num font-semibold" dir="ltr" style={{ textAlign: "start" }}>
                      {order.number}
                    </span>
                    <span className="min-w-0 truncate max-sm:col-start-1 max-sm:row-start-2 max-sm:text-xs max-sm:text-faint">
                      {order.customerName} <span className="text-faint">· {order.city}</span>
                    </span>
                    <span className="hidden text-soft sm:block">{date(order.createdAt)}</span>
                    <span className="num text-end font-semibold max-sm:row-start-1">{money(order.total)}</span>
                    <span className="text-end max-sm:row-start-2">
                      <StatusBadge status={order.status} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-soft">
              <span>{fill(t.admin.page, { page: n(page), pages: n(pages) })}</span>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost px-3" disabled={page <= 1} onClick={() => set("page", String(page - 1))} aria-label="prev">
                  <Prev className="size-4" />
                </button>
                <button type="button" className="btn-ghost px-3" disabled={page >= pages} onClick={() => set("page", String(page + 1))} aria-label="next">
                  <Next className="size-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <Modal open={open !== null} onClose={() => setOpen(null)} title={open?.number ?? ""} wide>
        {open && <OrderDetail id={open.id} onClose={() => setOpen(null)} />}
      </Modal>
    </div>
  );
}
