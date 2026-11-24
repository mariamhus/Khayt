import { boolean, customType, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType: () => "bytea",
  fromDriver: (value) => (Buffer.isBuffer(value) ? value : Buffer.from(value)),
});

export type Localized = { en: string; ar: string };
export type ProductColor = { key: string; name: Localized; hex: string };

export const CATEGORIES = ["tops", "dresses", "trousers", "outerwear", "accessories"] as const;
export const GARMENTS = ["tee", "shirt", "hoodie", "dress", "trousers", "jacket", "scarf"] as const;
export const FABRICS = ["cotton", "linen", "silk", "denim", "wool"] as const;
export const PATTERNS = ["solid", "stripe", "check", "dots"] as const;
export const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  isMain: boolean("is_main").notNull().default(false),
  nextOrder: integer("next_order").notNull().default(10001),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("customer"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  name: jsonb("name").$type<Localized>().notNull(),
  description: jsonb("description").$type<Localized>().notNull(),
  category: text("category").notNull(),
  garment: text("garment").notNull(),
  fabric: text("fabric").notNull(),
  pattern: text("pattern").notNull().default("solid"),
  price: integer("price").notNull(),
  compareAt: integer("compare_at"),
  colors: jsonb("colors").$type<ProductColor[]>().notNull(),
  sizes: jsonb("sizes").$type<string[]>().notNull(),
  images: jsonb("images").$type<Record<string, string>>().notNull().default({}),
  swatches: jsonb("swatches").$type<Record<string, string>>().notNull().default({}),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stock = pgTable(
  "stock",
  {
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    color: text("color").notNull(),
    size: text("size").notNull(),
    quantity: integer("quantity").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.productId, table.color, table.size] })],
);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  number: text("number").notNull(),
  status: text("status").notNull().default("pending"),
  subtotal: integer("subtotal").notNull(),
  shipping: integer("shipping").notNull(),
  total: integer("total").notNull(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull(),
  address: text("address").notNull(),
  payment: text("payment").notNull().default("cod"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  name: jsonb("name").$type<Localized>().notNull(),
  slug: text("slug").notNull(),
  color: text("color").notNull(),
  size: text("size").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
});

export const images = pgTable("images", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  mime: text("mime").notNull(),
  data: bytea("data").notNull(),
  width: integer("width").notNull().default(0),
  height: integer("height").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
