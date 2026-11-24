import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { z } from "zod";
import type { DB } from "../db/index.js";
import { orderItems, orders, products, stock, stores, type OrderStatus } from "../db/schema.js";
import { HttpError, notFound } from "./errors.js";
import { normalizePhone, type CheckoutInput } from "./schemas.js";

export type Exec = Pick<DB, "select" | "insert" | "update" | "delete" | "execute">;

export const FREE_SHIPPING_FROM = 150_000;
export const SHIPPING_FEE = 6_000;

export const shippingFor = (subtotal: number) => (subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE);

export async function nextOrderNumber(db: Exec, storeId: string) {
  const [row] = await db
    .update(stores)
    .set({ nextOrder: sql`${stores.nextOrder} + 1` })
    .where(eq(stores.id, storeId))
    .returning({ n: stores.nextOrder });
  if (!row) throw new HttpError(409, "no_store");
  return `KH-${row.n - 1}`;
}

export async function placeOrder(db: Exec, storeId: string, userId: string, input: z.infer<typeof CheckoutInput>) {
  const merged = new Map<string, { productId: string; color: string; size: string; quantity: number }>();
  for (const item of input.items) {
    const key = `${item.productId}|${item.color}|${item.size}`;
    const current = merged.get(key);
    if (current) current.quantity += item.quantity;
    else merged.set(key, { ...item });
  }
  const lines = [...merged.values()].sort((a, b) => `${a.productId}${a.color}${a.size}`.localeCompare(`${b.productId}${b.color}${b.size}`));
  const ids = [...new Set(lines.map((line) => line.productId))];
  const rows = await db.select().from(products).where(and(eq(products.storeId, storeId), eq(products.active, true), inArray(products.id, ids)));
  const byId = new Map(rows.map((row) => [row.id, row]));
  const problems: { productId: string; color: string; size: string; reason: string; available?: number }[] = [];
  const priced: { line: (typeof lines)[number]; product: (typeof rows)[number] }[] = [];

  for (const line of lines) {
    const product = byId.get(line.productId);
    if (!product || !product.colors.some((color) => color.key === line.color) || !product.sizes.includes(line.size)) {
      problems.push({ ...line, reason: "unavailable" });
      continue;
    }
    const [row] = await db
      .select({ quantity: stock.quantity })
      .from(stock)
      .where(and(eq(stock.productId, line.productId), eq(stock.color, line.color), eq(stock.size, line.size)))
      .for("update");
    const available = row?.quantity ?? 0;
    if (available < line.quantity) {
      problems.push({ ...line, reason: "stock", available });
      continue;
    }
    priced.push({ line, product });
  }
  if (problems.length) throw new HttpError(409, "cart_changed", undefined, { problems });

  for (const { line } of priced) {
    await db
      .update(stock)
      .set({ quantity: sql`${stock.quantity} - ${line.quantity}` })
      .where(and(eq(stock.productId, line.productId), eq(stock.color, line.color), eq(stock.size, line.size)));
  }
  const subtotal = priced.reduce((sum, { line, product }) => sum + product.price * line.quantity, 0);
  const shipping = shippingFor(subtotal);
  const number = await nextOrderNumber(db, storeId);
  const [order] = await db
    .insert(orders)
    .values({
      storeId,
      userId,
      number,
      status: input.payment === "card" ? "paid" : "pending",
      subtotal,
      shipping,
      total: subtotal + shipping,
      customerName: input.name,
      phone: normalizePhone(input.phone)!,
      city: input.city,
      address: input.address,
      payment: input.payment,
    })
    .returning();
  await db.insert(orderItems).values(priced.map(({ line, product }) => ({ orderId: order!.id, productId: product.id, name: product.name, slug: product.slug, color: line.color, size: line.size, quantity: line.quantity, unitPrice: product.price })));
  return order!;
}

export async function setOrderStatus(db: Exec, storeId: string, id: string, status: OrderStatus) {
  const [order] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.storeId, storeId))).for("update");
  if (!order) throw notFound();
  if (order.status === status) return;
  if (order.status === "cancelled") throw new HttpError(409, "order_cancelled");
  if (status === "cancelled") {
    const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    for (const line of lines) {
      if (!line.productId) continue;
      await db
        .insert(stock)
        .values({ productId: line.productId, color: line.color, size: line.size, quantity: line.quantity })
        .onConflictDoUpdate({ target: [stock.productId, stock.color, stock.size], set: { quantity: sql`${stock.quantity} + ${line.quantity}` } });
    }
  }
  await db.update(orders).set({ status }).where(eq(orders.id, id));
}

export async function orderDetail(db: Exec, id: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id)).orderBy(asc(orderItems.slug), asc(orderItems.color), asc(orderItems.size));
  const { storeId: _store, ...rest } = order;
  return { order: { ...rest, items }, storeId: order.storeId, userId: order.userId };
}
