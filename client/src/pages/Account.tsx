import { Link } from "react-router";
import { Package } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { useTitle } from "../lib/hooks";
import { useMe, useMyOrders } from "../lib/queries";
import { ErrorBox, Spinner, StatusBadge } from "../components/ui";

export function Account() {
  const { t, money, date, plural } = useI18n();
  const me = useMe();
  const orders = useMyOrders();
  useTitle(`${t.account.title} · ${t.brand}`);
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-20 sm:px-6">
      <h1 className="display text-5xl rtl:text-4xl">{t.account.title}</h1>
      <p className="mt-2 text-sm text-soft">{me.data?.isDemo ? me.data.name : me.data?.email}</p>
      {orders.isPending ? (
        <Spinner />
      ) : orders.isError ? (
        <ErrorBox onRetry={() => orders.refetch()} />
      ) : orders.data.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center p-12 text-center">
          <Package className="size-8 text-clay" />
          <p className="mt-4 text-soft">{t.account.empty}</p>
          <Link to="/shop" className="btn-dark mt-6">
            {t.cart.browse}
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {orders.data.map((order) => (
            <li key={order.id}>
              <Link to={`/orders/${order.id}`} className="card ring-focus flex items-center gap-4 p-4 transition hover:border-line-strong">
                <div className="min-w-0 flex-1">
                  <div className="num font-semibold" dir="ltr" style={{ textAlign: "start" }}>
                    {order.number}
                  </div>
                  <div className="text-xs text-faint">
                    {date(order.createdAt)} · {plural(t.account.items, order.items)}
                  </div>
                </div>
                <span className="num font-semibold">{money(order.total)}</span>
                <StatusBadge status={order.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
