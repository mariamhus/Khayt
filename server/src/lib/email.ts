import { env } from "../env.js";

type Line = { name: { en: string; ar: string }; color: string; size: string; quantity: number; unitPrice: number };
type MailOrder = { number: string; customerName: string; phone: string; city: string; address: string; payment: string; subtotal: number; shipping: number; total: number; items: Line[] };

const egp = (piasters: number) => `EGP ${(piasters / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const esc = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

async function send(to: string, subject: string, html: string) {
  if (!env.resendApiKey) {
    if (!env.test) console.log(`[email] RESEND_API_KEY not set, skipped "${subject}" to ${to}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.emailFrom, to: [to], subject, html }),
  });
  if (!res.ok) console.error(`[email] Resend rejected "${subject}": ${res.status} ${await res.text()}`);
}

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f2ec;font-family:Helvetica,Arial,sans-serif;color:#1d1a17">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="font-size:22px;font-weight:700;letter-spacing:.5px;margin:0 0 24px">Khayt</p>
<div style="background:#fff;border-radius:16px;padding:28px">
<h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
${body}
</div>
<p style="font-size:12px;color:#8a817a;margin-top:20px">You're getting this because you placed an order at Khayt.</p>
</div></body></html>`;
}

function itemsTable(order: MailOrder) {
  const rows = order.items
    .map((item) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${esc(item.name.en)}<br><span style="color:#8a817a;font-size:13px">${esc(item.color)} · ${esc(item.size)} · ×${item.quantity}</span></td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${egp(item.unitPrice * item.quantity)}</td></tr>`)
    .join("");
  const total = (label: string, value: string, bold = false) => `<tr><td style="padding:6px 0;${bold ? "font-weight:700" : "color:#5c554f"}">${label}</td><td style="padding:6px 0;text-align:right;${bold ? "font-weight:700" : ""}">${value}</td></tr>`;
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}${total("Subtotal", egp(order.subtotal))}${total("Shipping", order.shipping ? egp(order.shipping) : "Free")}${total("Total", egp(order.total), true)}</table>`;
}

export function sendOrderConfirmation(to: string, order: MailOrder) {
  const payment = order.payment === "card" ? "Card (paid)" : "Cash on delivery";
  const body = `<p style="margin:0 0 16px">Hi ${esc(order.customerName)}, thanks for your order. We'll call you on ${esc(order.phone)} to confirm delivery.</p>
<p style="margin:0 0 16px;font-size:14px;color:#5c554f">Order <b style="color:#1d1a17">${esc(order.number)}</b><br>Deliver to: ${esc(order.address)}, ${esc(order.city)}<br>Payment: ${payment}</p>
${itemsTable(order)}`;
  return send(to, `Order ${order.number} confirmed`, layout("Your order is confirmed", body));
}

export function sendPaymentReceipt(to: string, order: MailOrder, last4: string) {
  const body = `<p style="margin:0 0 16px">Hi ${esc(order.customerName)}, we've received your payment for order <b>${esc(order.number)}</b>.</p>
<p style="margin:0 0 16px;font-size:14px;color:#5c554f">Amount: <b style="color:#1d1a17">${egp(order.total)}</b><br>Card: •••• ${esc(last4)} (test card, nothing was charged)</p>`;
  return send(to, `Payment received for ${order.number}`, layout("Payment successful", body));
}
