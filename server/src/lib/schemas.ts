import { z } from "zod";
import { CATEGORIES, FABRICS, GARMENTS, ORDER_STATUSES, PATTERNS } from "../db/schema.js";
import { PALETTE } from "../db/catalogue.js";

const text = (max: number) => z.string().trim().max(max);

export const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "One size"] as const;
export const IMAGE_URL = /^(\/api\/images\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\/(products|fabrics)\/[a-z0-9-]{1,60}\.webp)$/;
const colorKeys = PALETTE.map((color) => color.key) as [string, ...string[]];

export function normalizePhone(raw: string) {
  const western = raw.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660)).replace(/[\s\-().]/g, "");
  const match = /^(?:\+?20|0020|0)?(1[0125]\d{8})$/.exec(western);
  return match ? `+20${match[1]}` : null;
}

export const Credentials = z.object({ email: z.email().trim().toLowerCase().max(160), password: z.string().min(8).max(200) });
export const Register = Credentials.extend({ name: text(80).min(2) });

export const CheckoutInput = z.object({
  items: z
    .array(z.object({ productId: z.uuid(), color: z.string().max(30), size: z.string().max(20), quantity: z.number().int().min(1).max(10) }))
    .min(1)
    .max(30),
  name: text(80).min(2),
  phone: z.string().max(30).refine((value) => normalizePhone(value) !== null, "invalid_phone"),
  city: text(60).min(2),
  address: text(200).min(5),
  payment: z.enum(["cod", "card"]).default("cod"),
});

const localized = (max: number, min = 1) => z.object({ en: text(max).min(min), ar: text(max).min(min) });

export const ProductInput = z
  .object({
    name: localized(80, 2),
    description: localized(600, 0),
    category: z.enum(CATEGORIES),
    garment: z.enum(GARMENTS),
    fabric: z.enum(FABRICS),
    pattern: z.enum(PATTERNS),
    price: z.number().int().min(100).max(10_000_000),
    compareAt: z.number().int().min(100).max(10_000_000).nullable().default(null),
    colors: z.array(z.enum(colorKeys)).min(1).max(6),
    sizes: z.array(z.enum(ALL_SIZES)).min(1).max(7),
    images: z.partialRecord(z.enum(colorKeys), z.string().regex(IMAGE_URL)).default({}),
    swatches: z.partialRecord(z.enum(colorKeys), z.string().regex(IMAGE_URL)).default({}),
    featured: z.boolean().default(false),
    active: z.boolean().default(true),
    stock: z.array(z.object({ color: z.string().max(30), size: z.string().max(20), quantity: z.number().int().min(0).max(9999) })).max(60).default([]),
  })
  .refine((value) => new Set(value.colors).size === value.colors.length && new Set(value.sizes).size === value.sizes.length, { message: "duplicates" })
  .refine((value) => value.compareAt === null || value.compareAt > value.price, { path: ["compareAt"], message: "compare_not_higher" });

export const CatalogQuery = z.object({
  category: z.enum(CATEGORIES).optional(),
  fabric: z.enum(FABRICS).optional(),
  color: z.enum(colorKeys).optional(),
  size: z.enum(ALL_SIZES).optional(),
  q: z.string().trim().max(60).optional(),
  featured: z.enum(["1"]).optional(),
  sort: z.enum(["featured", "new", "price_asc", "price_desc"]).default("featured"),
});

export const AdminOrdersQuery = z.object({
  status: z.enum(["all", ...ORDER_STATUSES]).default("all"),
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const StatusInput = z.object({ status: z.enum(ORDER_STATUSES) });
