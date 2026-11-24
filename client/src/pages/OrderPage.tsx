import { Link, useParams, useSearchParams } from "react-router";
import { CircleCheck } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { useTitle } from "../lib/hooks";
import { useOrder } from "../lib/queries";
import { ErrorBox, Spinner, StatusBadge } from "../components/ui";

const FLOW = ["pending", "paid", "shipped", "delivered"] as const;

export function OrderPage() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const query = useOrder(id);
  const { t, pick, money, fill, date } = useI18n();
  useTitle(query.data ? `${query.data.number} · ${t.brand}` : t.brand);
  if (query.isPending) return <Spinner />;
  if (query.isError) return <ErrorBox text={t.order.notFound} />;
  const order = query.data;
  const step = order.status === "cancelled" ? -1 : FLOW.indexOf(order.status as (typeof FLOW)[number]);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-20 sm:px-6">
      {params.get("new") === "1" && (
        <div className="rise mb-8 text-center">
          <CircleCheck className="mx-auto size-12 text-nile" />
          <h1 className="display mt-4 text-4xl rtl:text-3xl">{fill(t.order.thanks, { name: order.customerName.split(" ")[0] ?? "" })}</h1>
          <p className="mt-2 text-soft">{t.order.placed}</p>
        </div>
      )}
      <div className="card p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-faint">{t.order.number}</div>
            <div className="num text-2xl font-semibold" dir="ltr">
              {order.number}
            </div>
          </div>
          <div className="text-end">
            <StatusBadge status={order.status} />
            <div className="mt-1 text-xs text-faint">{date(order.createdAt)}</div>
          </div>
        </div>
        {step >= 0 && (
          <ol className="mt-6 grid grid-cols-4 gap-2">
            {t.order.steps.map((label, index) => (
              <li key={label} className="text-center">
                <div className={`h-1.5 rounded-full ${index <= step ? "bg-nile" : "bg-line"}`} />
                <div className={`mt-2 text-[11px] ${index <= step ? "font-semibold text-ink" : "text-faint"}`}>{label}</div>
              </li>
            ))}
          </ol>
        )}
        <ul className="mt-6 divide-y divide-line border-t border-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 py-3 text-sm">
              <div>
                <Link to={`/p/${item.slug}?color=${item.color}`} className="font-medium hover:underline">
                  {pick(item.name)}
                </Link>
                <div className="text-xs text-faint">
                  {item.color} · {item.size} · × {item.quantity}
                </div>
              </div>
              <span className="num font-medium">{money(item.unitPrice * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-soft">{t.cart.subtotal}</dt>
            <dd className="num">{money(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-soft">{t.cart.shipping}</dt>
            <dd className="num">{order.shipping ? money(order.shipping) : t.cart.free}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>{t.cart.total}</dt>
            <dd className="num">{money(order.total)}</dd>
          </div>
        </dl>
        <div className="mt-6 grid gap-4 rounded-2xl bg-linen p-4 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs text-faint">{t.order.deliverTo}</div>
            <div className="mt-1 font-medium">{order.customerName}</div>
            <div className="text-soft">
              {order.address}, {order.city}
            </div>
            <div className="text-soft" dir="ltr">
              {order.phone}
            </div>
          </div>
          <div>
            <div className="text-xs text-faint">{t.order.payment}</div>
            <div className="mt-1 font-medium">{order.payment === "card" ? t.checkout.card : t.checkout.cod}</div>
          </div>
        </div>
      </div>
      <div className="mt-6 text-center">
        <Link to="/shop" className="btn-dark">
          {t.order.continue}
        </Link>
      </div>
    </div>
  );
}
