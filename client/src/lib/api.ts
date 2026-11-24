export class ApiError extends Error {
  status: number;
  code: string;
  fields: { path: string; message: string }[];
  details?: Record<string, unknown>;
  constructor(status: number, code: string, fields: { path: string; message: string }[] = [], details?: Record<string, unknown>) {
    super(code);
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.details = details;
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: init.method ?? "GET",
    credentials: "include",
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : {},
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, data?.error?.code ?? "network", data?.error?.fields ?? [], data?.error?.details);
  return data as T;
}

export type Lang = "en" | "ar";
export type Localized = { en: string; ar: string };
export type Garment = "tee" | "shirt" | "hoodie" | "dress" | "trousers" | "jacket" | "scarf";
export type Fabric = "cotton" | "linen" | "silk" | "denim" | "wool";
export type Pattern = "solid" | "stripe" | "check" | "dots";
export type Category = "tops" | "dresses" | "trousers" | "outerwear" | "accessories";
export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";
export const CATEGORIES: Category[] = ["tops", "dresses", "trousers", "outerwear", "accessories"];
export const GARMENTS: Garment[] = ["tee", "shirt", "hoodie", "dress", "trousers", "jacket", "scarf"];
export const FABRICS: Fabric[] = ["cotton", "linen", "silk", "denim", "wool"];
export const PATTERNS: Pattern[] = ["solid", "stripe", "check", "dots"];
export const STATUSES: OrderStatus[] = ["pending", "paid", "shipped", "delivered", "cancelled"];

export type Color = { key: string; name: Localized; hex: string };
export type User = { id: string; email: string; name: string; role: "customer" | "admin"; isDemo: boolean };
export type Level = { color: string; size: string; quantity: number };

export type Product = {
  id: string;
  slug: string;
  name: Localized;
  description: Localized;
  category: Category;
  garment: Garment;
  fabric: Fabric;
  pattern: Pattern;
  price: number;
  compareAt: number | null;
  colors: Color[];
  sizes: string[];
  images: Record<string, string>;
  swatches: Record<string, string>;
  featured: boolean;
  active: boolean;
  inStock?: boolean;
};

export type ProductDetail = Product & { stock: Level[] };
export type AdminProduct = Product & { stock: number };

export type OrderItem = { id: string; productId: string | null; name: Localized; slug: string; color: string; size: string; quantity: number; unitPrice: number };
export type Order = {
  id: string;
  number: string;
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  total: number;
  customerName: string;
  phone: string;
  city: string;
  address: string;
  payment: "cod" | "card";
  createdAt: string;
  items: OrderItem[];
};
export type OrderRow = { id: string; number: string; status: OrderStatus; total: number; createdAt: string; items: number; customerName?: string; city?: string; payment?: string };

export type Meta = { palette: Color[]; sizes: string[]; shipping: { fee: number; freeFrom: number } };

export type Stats = {
  revenue: number;
  orders: number;
  average: number;
  trend: number | null;
  days: { day: string; revenue: number; orders: number }[];
  statuses: Partial<Record<OrderStatus, number>>;
  lowStock: { productId: string; slug: string; name: Localized; color: string; size: string; quantity: number }[];
  top: { slug: string; name: Localized; units: number; revenue: number }[];
  products: number;
  hidden: number;
};

export async function uploadImage(file: Blob) {
  const response = await fetch("/api/admin/images", { method: "POST", credentials: "include", headers: { "Content-Type": file.type || "image/webp" }, body: file });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, data?.error?.code ?? "network");
  return data as { url: string; width: number; height: number };
}

export async function prepareImage(file: File, max = 1400) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.88));
  if (!blob) throw new ApiError(415, "not_an_image");
  return blob;
}
