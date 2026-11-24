import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Banknote, CreditCard, Loader2 } from "lucide-react";
import { api, ApiError, type Order } from "../lib/api";
import { applyProblems, clearCart, SHIPPING, totals, useCart } from "../lib/cart";
import { useI18n } from "../lib/i18n";
import { useTitle } from "../lib/hooks";
import { useMe } from "../lib/queries";
import { CartLines, ShippingMeter } from "../components/CartDrawer";
import { Field } from "../components/ui";

const valid = (phone: string) => /^(?:\+?20|0020|0)?1[0125]\d{8}$/.test(phone.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660)).replace(/[\s\-().]/g, ""));

export function Checkout() {
  const { t, money } = useI18n();
  const me = useMe();
  const lines = useCart();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [form, setForm] = useState({ name: me.data?.name ?? "", email: me.data && !me.data.isDemo ? me.data.email : "", phone: "", city: "", address: "", payment: "cod" as "cod" | "card", cardNumber: "", cardExpiry: "", cardCvc: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const sum = totals(lines, SHIPPING);
  useTitle(`${t.checkout.title} · ${t.brand}`);

  if (lines.length === 0 && !busy)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-soft">{t.cart.empty}</p>
        <Link to="/shop" className="btn-dark mt-6">
          {t.cart.browse}
        </Link>
      </div>
    );

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = t.checkout.errors.name;
    if (!valid(form.phone)) next.phone = t.checkout.errors.phone;
    if (form.city.trim().length < 2) next.city = t.checkout.errors.city;
    if (form.address.trim().length < 5) next.address = t.checkout.errors.address;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = t.checkout.errors.email;
    if (form.payment === "card") {
      if (!/^\d{12,19}$/.test(form.cardNumber.replace(/[\s-]/g, ""))) next.cardNumber = t.checkout.errors.cardNumber;
      if (!/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(form.cardExpiry.trim())) next.cardExpiry = t.checkout.errors.cardExpiry;
      if (!/^\d{3,4}$/.test(form.cardCvc.trim())) next.cardCvc = t.checkout.errors.cardCvc;
    }
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      document.getElementById(`c-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const { cardNumber, cardExpiry, cardCvc, ...details } = form;
      const card = form.payment === "card" ? { number: cardNumber, expiry: cardExpiry, cvc: cardCvc } : undefined;
      const { order } = await api<{ order: Order }>("/orders", { method: "POST", body: { ...details, email: form.email.trim(), card, items: lines.map((line) => ({ productId: line.productId, color: line.color.key, size: line.size, quantity: line.quantity })) } });
      clearCart();
      client.invalidateQueries({ queryKey: ["orders"] });
      client.invalidateQueries({ queryKey: ["products"] });
      client.invalidateQueries({ queryKey: ["product"] });
      client.invalidateQueries({ queryKey: ["admin"] });
      navigate(`/orders/${order.id}?new=1`, { replace: true });
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === "cart_changed") {
        applyProblems((failure.details?.problems as never) ?? []);
        setErrors({ form: t.checkout.errors.cart_changed });
      } else if (failure instanceof ApiError && (failure.code === "card_declined" || failure.code === "card_expired" || failure.code === "card_not_test")) {
        setErrors({ form: t.checkout.errors[failure.code] });
      } else setErrors({ form: t.checkout.errors.generic });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto grid max-w-6xl gap-8 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[1fr_24rem]">
      <div>
        <h1 className="display text-5xl rtl:text-4xl">{t.checkout.title}</h1>
        <section className="card mt-8 p-5 sm:p-6">
          <h2 className="font-semibold">{t.checkout.contact}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field id="c-name" label={t.checkout.name} error={errors.name}>
              <input id="c-name" className="field" value={form.name} onChange={set("name")} autoComplete="name" maxLength={80} aria-invalid={Boolean(errors.name)} />
            </Field>
            <Field id="c-email" label={t.checkout.email} error={errors.email} hint={t.checkout.emailHint}>
              <input id="c-email" type="email" className="field rtl:text-right" dir="ltr" value={form.email} onChange={set("email")} autoComplete="email" maxLength={160} aria-invalid={Boolean(errors.email)} />
            </Field>
            <Field id="c-phone" label={t.checkout.phone} error={errors.phone} hint={t.checkout.phoneHint}>
              <input id="c-phone" className="field rtl:text-right" dir="ltr" inputMode="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" maxLength={20} placeholder="010 1234 5678" aria-invalid={Boolean(errors.phone)} />
            </Field>
            <Field id="c-city" label={t.checkout.city} error={errors.city}>
              <input id="c-city" className="field" value={form.city} onChange={set("city")} autoComplete="address-level2" maxLength={60} aria-invalid={Boolean(errors.city)} />
            </Field>
            <Field id="c-address" label={t.checkout.address} error={errors.address}>
              <input id="c-address" className="field" value={form.address} onChange={set("address")} autoComplete="street-address" maxLength={200} aria-invalid={Boolean(errors.address)} />
            </Field>
          </div>
        </section>
        <fieldset className="card mt-4 p-5 sm:p-6">
          <legend className="sr-only">{t.checkout.payment}</legend>
          <h2 className="font-semibold" aria-hidden>
            {t.checkout.payment}
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["cod", Banknote, t.checkout.cod, t.checkout.codText],
                ["card", CreditCard, t.checkout.card, t.checkout.cardText],
              ] as const
            ).map(([value, Icon, title, text]) => (
              <label key={value} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-clay ${form.payment === value ? "border-ink bg-white" : "border-line-strong hover:border-soft"}`}>
                <input type="radio" name="payment" className="sr-only" checked={form.payment === value} onChange={() => setForm((current) => ({ ...current, payment: value }))} />
                <Icon className={`mt-0.5 size-5 shrink-0 ${form.payment === value ? "text-clay" : "text-faint"}`} />
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="mt-0.5 block text-xs text-soft">{text}</span>
                </span>
              </label>
            ))}
          </div>
          {form.payment === "card" && (
            <div className="mt-5">
              <div className="grid gap-4 sm:grid-cols-[1fr_9rem_6rem]">
                <Field id="c-cardNumber" label={t.checkout.cardNumber} error={errors.cardNumber}>
                  <input id="c-cardNumber" className="field rtl:text-right" dir="ltr" inputMode="numeric" autoComplete="cc-number" value={form.cardNumber} onChange={set("cardNumber")} maxLength={23} placeholder="4242 4242 4242 4242" aria-invalid={Boolean(errors.cardNumber)} />
                </Field>
                <Field id="c-cardExpiry" label={t.checkout.cardExpiry} error={errors.cardExpiry}>
                  <input id="c-cardExpiry" className="field rtl:text-right" dir="ltr" inputMode="numeric" autoComplete="cc-exp" value={form.cardExpiry} onChange={set("cardExpiry")} maxLength={7} placeholder="12/30" aria-invalid={Boolean(errors.cardExpiry)} />
                </Field>
                <Field id="c-cardCvc" label={t.checkout.cardCvc} error={errors.cardCvc}>
                  <input id="c-cardCvc" className="field rtl:text-right" dir="ltr" inputMode="numeric" autoComplete="cc-csc" value={form.cardCvc} onChange={set("cardCvc")} maxLength={4} placeholder="123" aria-invalid={Boolean(errors.cardCvc)} />
                </Field>
              </div>
              <p className="mt-3 text-xs text-soft">{t.checkout.testCards}</p>
            </div>
          )}
        </fieldset>
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card p-5">
          <h2 className="font-semibold">{t.checkout.summary}</h2>
          <CartLines lines={lines} compact />
          <ShippingMeter lines={lines} />
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-soft">{t.cart.subtotal}</dt>
              <dd className="num">{money(sum.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-soft">{t.cart.shipping}</dt>
              <dd className="num">{sum.shipping ? money(sum.shipping) : t.cart.free}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold">
              <dt>{t.cart.total}</dt>
              <dd className="num">{money(sum.total)}</dd>
            </div>
          </dl>
          {errors.form && (
            <p className="mt-4 rounded-2xl bg-clay-soft px-4 py-3 text-sm text-clay" role="alert">
              {errors.form}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-clay mt-5 w-full py-3.5 text-base">
            {busy && <Loader2 className="size-4 animate-spin" />}
            {busy ? t.checkout.placing : `${t.checkout.place} · ${money(sum.total)}`}
          </button>
        </div>
      </aside>
    </form>
  );
}
