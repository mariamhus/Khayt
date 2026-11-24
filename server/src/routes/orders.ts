import { Router } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/index.js";
import { orderItems, orders } from "../db/schema.js";
import { userId } from "../lib/auth.js";
import { sendOrderConfirmation, sendPaymentReceipt } from "../lib/email.js";
import { HttpError, notFound } from "../lib/errors.js";
import { orderDetail, placeOrder } from "../lib/orders.js";
import { CheckoutInput } from "../lib/schemas.js";

export const orderRoutes = Router();

// Demo payments only: no real processor is connected and card details are never stored.
export const TEST_CARD_OK = "4242424242424242";
export const TEST_CARD_DECLINED = "4000000000000002";

function chargeTestCard(card: z.infer<typeof CheckoutInput>["card"]) {
  if (!card) throw new HttpError(400, "card_required");
  const [month, year] = card.expiry.split("/").map((part) => Number(part.trim()));
  const now = new Date();
  const fullYear = 2000 + year!;
  if (fullYear < now.getFullYear() || (fullYear === now.getFullYear() && month! < now.getMonth() + 1)) throw new HttpError(402, "card_expired");
  if (card.number === TEST_CARD_DECLINED) throw new HttpError(402, "card_declined");
  if (card.number !== TEST_CARD_OK) throw new HttpError(402, "card_not_test");
}

orderRoutes.post("/", async (req, res) => {
  const input = CheckoutInput.parse(req.body);
  if (input.payment === "card") chargeTestCard(input.card);
  const db = await getDb();
  const order = await db.transaction((tx) => placeOrder(tx, req.user!.storeId, userId(req), input));
  const detail = await orderDetail(db, order.id);
  res.status(201).json({ order: detail!.order });

  const to = input.email ?? (req.user!.isDemo ? undefined : req.user!.email);
  if (to) {
    const mail = detail!.order;
    sendOrderConfirmation(to, mail)
      .then(() => (input.payment === "card" ? sendPaymentReceipt(to, mail, input.card!.number.slice(-4)) : undefined))
      .catch((error) => console.error("[email]", error));
  }
});

orderRoutes.get("/", async (req, res) => {
  const db = await getDb();
  const rows = await db
    .select({ id: orders.id, number: orders.number, status: orders.status, total: orders.total, createdAt: orders.createdAt, items: sql<number>`(select coalesce(sum(${orderItems.quantity}), 0) from ${orderItems} where ${orderItems.orderId} = ${orders.id})::int` })
    .from(orders)
    .where(eq(orders.userId, userId(req)))
    .orderBy(desc(orders.createdAt))
    .limit(50);
  res.json({ orders: rows });
});

orderRoutes.get("/:id", async (req, res) => {
  const parsed = z.uuid().safeParse(req.params.id);
  if (!parsed.success) throw notFound();
  const db = await getDb();
  const detail = await orderDetail(db, parsed.data);
  const user = req.user!;
  const allowed = detail && detail.storeId === user.storeId && (detail.userId === user.id || user.role === "admin");
  if (!detail || !allowed) throw notFound();
  res.json({ order: detail.order });
});
