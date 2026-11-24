import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { env } from "../env.js";
import type { Exec } from "../lib/orders.js";
import { pick, seeded } from "../lib/random.js";
import { CATALOGUE } from "./catalogue.js";
import { orderItems, orders, products, stock, stores, users } from "./schema.js";

export const DEMO_ADMIN_EMAIL = "admin@khayt.shop";
export const DEMO_ADMIN_PASSWORD = "khayt2026";

export async function seedCatalogue(db: Exec, storeId: string, seed = 7) {
  const random = seeded(seed);
  const rows = await db
    .insert(products)
    .values(CATALOGUE.map((product, position) => ({ ...product, images: product.images ?? {}, swatches: product.swatches ?? {}, compareAt: product.compareAt ?? null, featured: product.featured ?? false, storeId, position })))
    .returning();
  const stockRows = rows.flatMap((product) =>
    product.colors.flatMap((color) =>
      product.sizes.map((size) => {
        const roll = random();
        return { productId: product.id, color: color.key, size, quantity: roll < 0.12 ? 0 : roll < 0.3 ? 1 + Math.floor(random() * 2) : 3 + Math.floor(random() * 10) };
      }),
    ),
  );
  for (let i = 0; i < stockRows.length; i += 200) await db.insert(stock).values(stockRows.slice(i, i + 200));
  return rows;
}

export async function ensureMainStore(db: Exec & { transaction: <T>(run: (tx: Exec) => Promise<T>) => Promise<T> }) {
  const [existing] = await db.select({ id: stores.id }).from(stores).where(eq(stores.isMain, true));
  if (existing) return;
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(7311)`);
    const [again] = await tx.select({ id: stores.id }).from(stores).where(eq(stores.isMain, true));
    if (again) return;
    const [store] = await tx.insert(stores).values({ name: "Khayt", isMain: true }).returning();
    await seedCatalogue(tx, store!.id);
    const email = (process.env.ADMIN_EMAIL || DEMO_ADMIN_EMAIL).toLowerCase();
    const password = process.env.ADMIN_PASSWORD || DEMO_ADMIN_PASSWORD;
    if (env.production && env.databaseUrl && !process.env.ADMIN_PASSWORD) return;
    await tx.insert(users).values({ storeId: store!.id, email, name: "Store admin", passwordHash: await bcrypt.hash(password, 10), role: "admin" });
  });
}

const PEOPLE = ["Nour Ahmed", "Omar Khaled", "مريم سامي", "Hana Mostafa", "يوسف علي", "Farida Hassan", "Ali Tarek", "سارة محمود", "Mohamed Ibrahim", "Laila Youssef", "أحمد فتحي", "Mai Adel", "Karim Fawzy", "ندى حسين"];
const CITIES = ["Cairo", "Giza", "Alexandria", "6th of October", "Mansoura", "New Cairo", "Tanta", "Zagazig"];

export async function seedSandbox(db: Exec, storeId: string) {
  const rows = await seedCatalogue(db, storeId, 11);
  const random = seeded(20261115);
  const now = Date.now();
  let number = 10001;
  for (let day = 29; day >= 0; day -= 1) {
    const count = 1 + Math.floor(random() * 3) + (day % 7 < 2 ? 1 : 0);
    for (let i = 0; i < count; i += 1) {
      const createdAt = new Date(now - day * 86_400_000 - Math.floor(random() * 10 * 3_600_000) - 600_000);
      const lineCount = 1 + Math.floor(random() * 3);
      const lines = Array.from({ length: lineCount }, () => {
        const product = pick(rows, random);
        return { product, color: pick(product.colors, random).key, size: pick(product.sizes, random), quantity: random() < 0.8 ? 1 : 2 };
      });
      const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
      const shipping = subtotal >= 150_000 ? 0 : 6_000;
      const roll = random();
      const status = day > 6 ? (roll < 0.86 ? "delivered" : roll < 0.93 ? "cancelled" : "shipped") : day > 2 ? (roll < 0.5 ? "shipped" : roll < 0.85 ? "delivered" : "paid") : roll < 0.55 ? "pending" : roll < 0.9 ? "paid" : "shipped";
      const [order] = await db
        .insert(orders)
        .values({
          storeId,
          number: `KH-${number}`,
          status,
          subtotal,
          shipping,
          total: subtotal + shipping,
          customerName: pick(PEOPLE, random),
          phone: `+2010${String(Math.floor(random() * 1e8)).padStart(8, "0")}`,
          city: pick(CITIES, random),
          address: `${1 + Math.floor(random() * 90)} El-Nasr Street`,
          payment: random() < 0.6 ? "cod" : "card",
          createdAt,
        })
        .returning({ id: orders.id });
      number += 1;
      await db.insert(orderItems).values(lines.map((line) => ({ orderId: order!.id, productId: line.product.id, name: line.product.name, slug: line.product.slug, color: line.color, size: line.size, quantity: line.quantity, unitPrice: line.product.price })));
    }
  }
  await db.update(stores).set({ nextOrder: number }).where(eq(stores.id, storeId));
}
