import { Router } from "express";
import { and, asc, desc, eq, ne, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { CATEGORIES, FABRICS, GARMENTS, PATTERNS, images, products, stock } from "../db/schema.js";
import { z } from "zod";
import { PALETTE } from "../db/catalogue.js";
import { storeOf } from "../lib/auth.js";
import { notFound } from "../lib/errors.js";
import { FREE_SHIPPING_FROM, SHIPPING_FEE } from "../lib/orders.js";
import { ALL_SIZES, CatalogQuery } from "../lib/schemas.js";

export const catalog = Router();

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);
const total = sql<number>`coalesce((select sum(${stock.quantity}) from ${stock} where ${stock.productId} = ${products.id}), 0)::int`;

type Row = typeof products.$inferSelect;
const present = ({ storeId: _store, position: _position, ...product }: Row) => product;

catalog.get("/meta", (_req, res) => {
  res.json({ palette: PALETTE, sizes: ALL_SIZES, categories: CATEGORIES, garments: GARMENTS, fabrics: FABRICS, patterns: PATTERNS, shipping: { fee: SHIPPING_FEE, freeFrom: FREE_SHIPPING_FROM } });
});

catalog.get("/products", async (req, res) => {
  const query = CatalogQuery.parse(req.query);
  const db = await getDb();
  const where: SQL[] = [eq(products.storeId, await storeOf(req)), eq(products.active, true)];
  if (query.category) where.push(eq(products.category, query.category));
  if (query.fabric) where.push(eq(products.fabric, query.fabric));
  if (query.featured) where.push(eq(products.featured, true));
  if (query.color) where.push(sql`${products.colors} @> ${JSON.stringify([{ key: query.color }])}::jsonb`);
  if (query.size) where.push(sql`exists (select 1 from ${stock} where ${stock.productId} = ${products.id} and ${stock.size} = ${query.size} and ${stock.quantity} > 0)`);
  if (query.q) {
    const like = `%${escapeLike(query.q)}%`;
    where.push(sql`(${products.name}->>'en' ilike ${like} or ${products.name}->>'ar' ilike ${like} or ${products.fabric} ilike ${like})`);
  }
  const order = { featured: [desc(products.featured), asc(products.position)], new: [desc(products.createdAt), desc(products.position)], price_asc: [asc(products.price)], price_desc: [desc(products.price)] }[query.sort];
  const rows = await db
    .select({ product: products, stock: total })
    .from(products)
    .where(and(...where))
    .orderBy(...order);
  res.json({ products: rows.map((row) => ({ ...present(row.product), inStock: row.stock > 0 })) });
});

catalog.get("/products/:slug", async (req, res) => {
  const slug = String(req.params.slug ?? "");
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) throw notFound();
  const db = await getDb();
  const storeId = await storeOf(req);
  const [product] = await db.select().from(products).where(and(eq(products.storeId, storeId), eq(products.slug, slug), eq(products.active, true)));
  if (!product) throw notFound();
  const [levels, related] = await Promise.all([
    db.select({ color: stock.color, size: stock.size, quantity: stock.quantity }).from(stock).where(eq(stock.productId, product.id)),
    db
      .select({ product: products, stock: total })
      .from(products)
      .where(and(eq(products.storeId, storeId), eq(products.active, true), ne(products.id, product.id)))
      .orderBy(sql`(${products.category} = ${product.category}) desc, (${products.fabric} = ${product.fabric}) desc`, asc(products.position))
      .limit(4),
  ]);
  res.json({
    product: { ...present(product), stock: levels.map((level) => ({ ...level, quantity: Math.min(level.quantity, 10) })) },
    related: related.map((row) => ({ ...present(row.product), inStock: row.stock > 0 })),
  });
});

catalog.get("/images/:id", async (req, res) => {
  const parsed = z.uuid().safeParse(req.params.id);
  if (!parsed.success) throw notFound();
  const db = await getDb();
  const [row] = await db.select({ mime: images.mime, data: images.data }).from(images).where(eq(images.id, parsed.data));
  if (!row) throw notFound();
  res.setHeader("Content-Type", row.mime);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'");
  res.send(row.data);
});
