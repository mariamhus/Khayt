import { useEffect } from "react";
import { Link } from "react-router";
import { Minus, Plus, ShoppingBag, Truck, X } from "lucide-react";
import { setCartOpen, setQuantity, SHIPPING, totals, useCart, useCartOpen, type CartLine } from "../lib/cart";
import { useI18n } from "../lib/i18n";
import { GarmentArt } from "./GarmentArt";

export function CartLines({ lines, compact = false }: { lines: CartLine[]; compact?: boolean }) {
  const { t, pick, money } = useI18n();
  return (
    <ul className="divide-y divide-line">
      {lines.map((line) => (
        <li key={`${line.productId}${line.color.key}${line.size}`} className="flex gap-3 py-4">
          <Link to={`/p/${line.slug}?color=${line.color.key}`} className="ring-focus grid h-24 w-20 shrink-0 place-items-center rounded-2xl bg-linen">
            <GarmentArt garment={line.garment} pattern={line.pattern} fabric={line.fabric} hex={line.color.hex} image={line.image} className="h-20" />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-2">
              <Link to={`/p/${line.slug}?color=${line.color.key}`} className="truncate text-sm font-semibold hover:underline">
                {pick(line.name)}
              </Link>
              <span className="num shrink-0 text-sm font-semibold">{money(line.price * line.quantity)}</span>
            </div>
            <div className="mt-0.5 text-xs text-soft">
              {pick(line.color.name)} · {line.size}
            </div>
            {!compact && (
              <div className="mt-auto flex items-center justify-between pt-2">
                <div className="flex items-center rounded-full border border-line-strong">
                  <button type="button" className="ring-focus grid size-8 place-items-center rounded-full text-soft hover:text-ink" onClick={() => setQuantity(line.productId, line.color.key, line.size, line.quantity - 1)} aria-label={`${t.cart.qty} −`}>
                    <Minus className="size-3.5" />
                  </button>
                  <span className="num w-6 text-center text-sm font-semibold" aria-live="polite">
                    {line.quantity}
                  </span>
                  <button type="button" className="ring-focus grid size-8 place-items-center rounded-full text-soft hover:text-ink disabled:opacity-30" disabled={line.quantity >= line.max} onClick={() => setQuantity(line.productId, line.color.key, line.size, line.quantity + 1)} aria-label={`${t.cart.qty} +`}>
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <button type="button" className="text-xs text-faint underline-offset-2 hover:text-clay hover:underline" onClick={() => setQuantity(line.productId, line.color.key, line.size, 0)}>
                  {t.cart.remove}
                </button>
              </div>
            )}
            {compact && <div className="num mt-auto text-xs text-faint">× {line.quantity}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ShippingMeter({ lines }: { lines: CartLine[] }) {
  const { t, fill, money } = useI18n();
  const sum = totals(lines, SHIPPING);
  const progress = Math.min(1, sum.subtotal / SHIPPING.freeFrom);
  return (
    <div className="rounded-2xl bg-linen p-3.5">
      <div className="flex items-center gap-2 text-xs font-medium text-soft">
        <Truck className="size-4 text-nile" />
        {sum.toFree > 0 ? fill(t.cart.toFree, { amount: money(sum.toFree) }) : t.cart.gotFree}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-nile transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}

export function CartDrawer() {
  const { t, money } = useI18n();
  const lines = useCart();
  const open = useCartOpen();
  const sum = totals(lines, SHIPPING);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setCartOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t.cart.title}>
      <button type="button" className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => setCartOpen(false)} aria-label={t.common.close} />
      <aside className="drawer-in absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="display text-2xl">{t.cart.title}</h2>
          <button type="button" onClick={() => setCartOpen(false)} className="btn-quiet p-2" aria-label={t.common.close} autoFocus>
            <X className="size-5" />
          </button>
        </div>
        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-linen text-soft">
              <ShoppingBag className="size-6" />
            </span>
            <p className="text-soft">{t.cart.empty}</p>
            <Link to="/shop" className="btn-dark" onClick={() => setCartOpen(false)}>
              {t.cart.browse}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5">
              <CartLines lines={lines} />
            </div>
            <div className="space-y-3 border-t border-line p-5">
              <ShippingMeter lines={lines} />
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-soft">{t.cart.subtotal}</span>
                <span className="num text-xl font-semibold">{money(sum.subtotal)}</span>
              </div>
              <Link to="/checkout" className="btn-clay w-full py-3.5 text-base" onClick={() => setCartOpen(false)}>
                {t.cart.checkout}
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
