import express, { Router } from "express";
import { and, asc, count, desc, eq, gte, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/index.js";
import { images, orderItems, orders, products, stock } from "../db/schema.js";
import { MAX_IMAGE_BYTES, MAX_IMAGES_PER_STORE, sniff } from "../lib/images.js";
import { PALETTE } from "../db/catalogue.js";
import { HttpError, notFound } from "../lib/errors.js";
import { orderDetail, setOrderStatus } from "../lib/orders.js";
import { AdminOrdersQuery, ProductInput, StatusInput } from "../lib/schemas.js";

export const admin = Router();

const Id = z.object({ id: z.uuid() });
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);
const cairoDay = sql<string>`to_char(${orders.createdAt} at time zone 'Africa/Cairo', 'YYYY-MM-DD')`;
const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" });

admin.get("/stats", async (req, res) => {
  const storeId = req.user!.storeId;
  const db = await getDb();
  const since = new Date(Date.now() - 29 * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);
  const live = and(eq(orders.storeId, storeId), ne(orders.status, "cancelled"), gte(orders.createdAt, since));
  const [daily, statuses, low, top, [catalogue]] = await Promise.all([
    db.select({ day: cairoDay, revenue: sql<number>`sum(${orders.total})::int`, orders: count() }).from(orders).where(live).groupBy(cairoDay),
    db.select({ status: orders.status, n: count() }).from(orders).where(eq(orders.storeId, storeId)).groupBy(orders.status),
    db
      .select({ productId: products.id, slug: products.slug, name: products.name, color: stock.color, size: stock.size, quantity: stock.quantity })
      .from(stock)
      .innerJoin(products, eq(products.id, stock.productId))
      .where(and(eq(products.storeId, storeId), eq(products.active, true), sql`${stock.quantity} <= 2`))
      .orderBy(asc(stock.quantity), asc(products.position))
      .limit(8),
    db
      .select({ slug: orderItems.slug, name: sql<{ en: string; ar: string }>`(array_agg(${orderItems.name}))[1]`, units: sql<number>`sum(${orderItems.quantity})::int`, revenue: sql<number>`sum(${orderItems.quantity} * ${orderItems.unitPrice})::int` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(live)
      .groupBy(orderItems.slug)
      .orderBy(desc(sql`sum(${orderItems.quantity})`))
      .limit(5),
    db.select({ products: sql<number>`count(*) filter (where ${products.active})::int`, hidden: sql<number>`count(*) filter (where not ${products.active})::int` }).from(products).where(eq(products.storeId, storeId)),
  ]);
  const byDay = new Map(daily.map((row) => [row.day, row]));
  const days = Array.from({ length: 30 }, (_, index) => {
    const key = dayFormat.format(new Date(Date.now() - (29 - index) * 86_400_000));
    return { day: key, revenue: Number(byDay.get(key)?.revenue ?? 0), orders: Number(byDay.get(key)?.orders ?? 0) };
  });
  const revenue = days.reduce((sum, day) => sum + day.revenue, 0);
  const orderCount = days.reduce((sum, day) => sum + day.orders, 0);
  const half = days.slice(15).reduce((sum, day) => sum + day.revenue, 0);
  const previous = days.slice(0, 15).reduce((sum, day) => sum + day.revenue, 0);
  res.json({
    revenue,
    orders: orderCount,
    average: orderCount ? Math.round(revenue / orderCount) : 0,
    trend: previous ? Math.round(((half - previous) / previous) * 100) : null,
    days,
    statuses: Object.fromEntries(statuses.map((row) => [row.status, Number(row.n)])),
    lowStock: low,
    top: top.map((row) => ({ ...row, units: Number(row.units), revenue: Number(row.revenue) })),
    products: catalogue?.products ?? 0,
    hidden: catalogue?.hidden ?? 0,
  });
});

admin.get("/products", async (req, res) => {
  const db = await getDb();
  const rows = await db
    .select({ product: products, stock: sql<number>`coalesce((select sum(${stock.quantity}) from ${stock} where ${stock.productId} = ${products.id}), 0)::int` })
    .from(products)
    .where(eq(products.storeId, req.user!.storeId))
    .orderBy(asc(products.position), asc(products.createdAt));
  res.json({ products: rows.map(({ product: { storeId: _store, ...product }, stock: units }) => ({ ...product, stock: units })) });
});

admin.get("/products/:id", async (req, res) => {
  const { id } = Id.parse(req.params);
  const db = await getDb();
  const [product] = await db.select().from(products).where(and(eq(products.id, id), eq(products.storeId, req.user!.storeId)));
  if (!product) throw notFound();
  const levels = await db.select({ color: stock.color, size: stock.size, quantity: stock.quantity }).from(stock).where(eq(stock.productId, id));
  const { storeId: _store, ...rest } = product;
  res.json({ product: { ...rest, stock: levels } });
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "product";

type Input = z.infer<typeof ProductInput>;

async function checkImages(storeId: string, input: Input) {
  const keep = (map: Partial<Record<string, string>>) => Object.fromEntries(Object.entries(map).filter(([key, url]) => url && input.colors.includes(key))) as Record<string, string>;
  const photos = keep(input.images);
  const swatches = keep(input.swatches);
  const ids = [...new Set([...Object.values(photos), ...Object.values(swatches)].filter((url) => url.startsWith("/api/images/")).map((url) => url.split("/").pop()!))];
  if (ids.length) {
    const db = await getDb();
    const found = await db.select({ id: images.id }).from(images).where(and(eq(images.storeId, storeId), inArray(images.id, ids)));
    if (found.length !== ids.length) throw new HttpError(400, "unknown_image");
  }
  return { images: photos, swatches };
}

function fields(input: Input) {
  return {
    name: input.name,
    description: input.description,
    category: input.category,
    garment: input.garment,
    fabric: input.fabric,
    pattern: input.pattern,
    price: input.price,
    compareAt: input.compareAt,
    colors: input.colors.map((key) => PALETTE.find((color) => color.key === key)!),
    sizes: input.sizes,
    featured: input.featured,
    active: input.active,
  };
}

function levels(productId: string, input: Input) {
  const wanted = new Map(input.stock.map((row) => [`${row.color}|${row.size}`, row.quantity]));
  return input.colors.flatMap((color) => input.sizes.map((size) => ({ productId, color, size, quantity: wanted.get(`${color}|${size}`) ?? 0 })));
}

admin.post("/products", async (req, res) => {
  const input = ProductInput.parse(req.body);
  const storeId = req.user!.storeId;
  const db = await getDb();
  const photos = await checkImages(storeId, input);
  const product = await db.transaction(async (tx) => {
    const base = slugify(input.name.en);
    let slug = base;
    for (let n = 2; n < 50; n += 1) {
      const [taken] = await tx.select({ id: products.id }).from(products).where(and(eq(products.storeId, storeId), eq(products.slug, slug)));
      if (!taken) break;
      slug = `${base}-${n}`;
    }
    const [{ n: position } = { n: 0 }] = await tx.select({ n: count() }).from(products).where(eq(products.storeId, storeId));
    const [created] = await tx.insert(products).values({ ...fields(input), ...photos, storeId, slug, position: Number(position) }).returning();
    await tx.insert(stock).values(levels(created!.id, input));
    return created!;
  });
  res.status(201).json({ product: { id: product.id, slug: product.slug } });
});

admin.put("/products/:id", async (req, res) => {
  const { id } = Id.parse(req.params);
  const input = ProductInput.parse(req.body);
  const db = await getDb();
  const photos = await checkImages(req.user!.storeId, input);
  await db.transaction(async (tx) => {
    const [updated] = await tx.update(products).set({ ...fields(input), ...photos }).where(and(eq(products.id, id), eq(products.storeId, req.user!.storeId))).returning({ id: products.id });
    if (!updated) throw notFound();
    await tx.delete(stock).where(eq(stock.productId, id));
    await tx.insert(stock).values(levels(id, input));
  });
  res.json({ ok: true });
});

admin.delete("/products/:id", async (req, res) => {
  const { id } = Id.parse(req.params);
  const db = await getDb();
  const [product] = await db.select({ id: products.id }).from(products).where(and(eq(products.id, id), eq(products.storeId, req.user!.storeId)));
  if (!product) throw notFound();
  const [used] = await db.select({ n: count() }).from(orderItems).where(eq(orderItems.productId, id));
  if (Number(used?.n ?? 0) > 0) {
    await db.update(products).set({ active: false }).where(eq(products.id, id));
    res.json({ hidden: true });
    return;
  }
  await db.delete(products).where(eq(products.id, id));
  res.json({ hidden: false });
});

admin.post("/images", express.raw({ type: ["image/png", "image/jpeg", "image/webp"], limit: MAX_IMAGE_BYTES }), async (req, res) => {
  const data = Buffer.isBuffer(req.body) ? req.body : null;
  const kind = data ? sniff(data) : null;
  if (!data || !kind) throw new HttpError(415, "not_an_image");
  if (kind.width < 64 || kind.height < 64 || kind.width > 4000 || kind.height > 4000) throw new HttpError(400, "bad_dimensions");
  const storeId = req.user!.storeId;
  const db = await getDb();
  const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(images).where(eq(images.storeId, storeId));
  if (Number(n) >= MAX_IMAGES_PER_STORE) throw new HttpError(409, "too_many_images");
  const [row] = await db.insert(images).values({ storeId, mime: kind.mime, data, width: kind.width, height: kind.height }).returning({ id: images.id });
  res.status(201).json({ url: `/api/images/${row!.id}`, width: kind.width, height: kind.height });
});

admin.get("/orders", async (req, res) => {
  const query = AdminOrdersQuery.parse(req.query);
  const db = await getDb();
  const where: SQL[] = [eq(orders.storeId, req.user!.storeId)];
  if (query.status !== "all") where.push(eq(orders.status, query.status));
  if (query.q) {
    const like = `%${escapeLike(query.q)}%`;
    where.push(or(ilike(orders.number, like), ilike(orders.customerName, like), ilike(orders.phone, like))!);
  }
  const [rows, [total]] = await Promise.all([
    db
      .select({ id: orders.id, number: orders.number, status: orders.status, total: orders.total, customerName: orders.customerName, city: orders.city, payment: orders.payment, createdAt: orders.createdAt, items: sql<number>`(select coalesce(sum(${orderItems.quantity}), 0) from ${orderItems} where ${orderItems.orderId} = ${orders.id})::int` })
      .from(orders)
      .where(and(...where))
      .orderBy(desc(orders.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ n: count() }).from(orders).where(and(...where)),
  ]);
  res.json({ orders: rows, total: Number(total?.n ?? 0), page: query.page, pageSize: query.pageSize });
});

admin.put("/orders/:id/status", async (req, res) => {
  const { id } = Id.parse(req.params);
  const { status } = StatusInput.parse(req.body);
  const db = await getDb();
  const storeId = req.user!.storeId;
  await db.transaction((tx) => setOrderStatus(tx, storeId, id, status));
  const detail = await orderDetail(db, id);
  if (!detail) throw new HttpError(404, "not_found");
  res.json({ order: detail.order });
});
