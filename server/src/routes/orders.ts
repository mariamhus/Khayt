import { Router } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/index.js";
import { orderItems, orders } from "../db/schema.js";
import { userId } from "../lib/auth.js";
import { notFound } from "../lib/errors.js";
import { orderDetail, placeOrder } from "../lib/orders.js";
import { CheckoutInput } from "../lib/schemas.js";

export const orderRoutes = Router();

orderRoutes.post("/", async (req, res) => {
  const input = CheckoutInput.parse(req.body);
  const db = await getDb();
  const order = await db.transaction((tx) => placeOrder(tx, req.user!.storeId, userId(req), input));
  const detail = await orderDetail(db, order.id);
  res.status(201).json({ order: detail!.order });
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
