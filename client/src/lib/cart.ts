import { useSyncExternalStore } from "react";
import type { Fabric, Garment, Localized, Pattern, Product, Color } from "./api";

export type CartLine = {
  productId: string;
  slug: string;
  name: Localized;
  garment: Garment;
  fabric: Fabric;
  pattern: Pattern;
  price: number;
  color: Color;
  size: string;
  quantity: number;
  max: number;
  image?: string;
};

const KEY = "khayt:cart";
const listeners = new Set<() => void>();
let cache: CartLine[] | null = null;
let raw: string | null = null;
let open = false;

function read(): CartLine[] {
  let next: string | null = null;
  try {
    next = localStorage.getItem(KEY);
  } catch {
    next = null;
  }
  if (cache && next === raw) return cache;
  raw = next;
  try {
    const parsed = next ? JSON.parse(next) : [];
    cache = Array.isArray(parsed) ? parsed.filter((line) => line && typeof line.productId === "string" && line.color && typeof line.quantity === "number") : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function write(lines: CartLine[]) {
  cache = lines;
  try {
    raw = JSON.stringify(lines);
    localStorage.setItem(KEY, raw);
  } catch {
    raw = null;
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => event.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: CartLine[] = [];
const same = (line: CartLine, productId: string, color: string, size: string) => line.productId === productId && line.color.key === color && line.size === size;

export const useCart = () => useSyncExternalStore(subscribe, read, () => EMPTY);
export const useCartOpen = () => useSyncExternalStore(subscribe, () => open, () => false);

export function setCartOpen(value: boolean) {
  open = value;
  listeners.forEach((listener) => listener());
}

export function addToCart(product: Product, color: Color, size: string, quantity: number, max: number) {
  const lines = read();
  const existing = lines.find((line) => same(line, product.id, color.key, size));
  const limit = Math.max(1, Math.min(10, max));
  if (existing) write(lines.map((line) => (line === existing ? { ...line, quantity: Math.min(limit, line.quantity + quantity), max: limit, price: product.price } : line)));
  else write([...lines, { productId: product.id, slug: product.slug, name: product.name, garment: product.garment, fabric: product.fabric, pattern: product.pattern, price: product.price, color, size, quantity: Math.min(limit, quantity), max: limit, image: product.images?.[color.key] }]);
}

export function setQuantity(productId: string, color: string, size: string, quantity: number) {
  write(
    read()
      .map((line) => (same(line, productId, color, size) ? { ...line, quantity: Math.max(0, Math.min(line.max, quantity)) } : line))
      .filter((line) => line.quantity > 0),
  );
}

export function applyProblems(problems: { productId: string; color: string; size: string; reason: string; available?: number }[]) {
  write(
    read()
      .map((line) => {
        const problem = problems.find((item) => same(line, item.productId, item.color, item.size));
        if (!problem) return line;
        const available = problem.reason === "stock" ? (problem.available ?? 0) : 0;
        return { ...line, quantity: Math.min(line.quantity, available), max: Math.max(1, available) };
      })
      .filter((line) => line.quantity > 0),
  );
}

export const clearCart = () => write([]);

export function totals(lines: CartLine[], shipping: { fee: number; freeFrom: number }) {
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const fee = lines.length === 0 || subtotal >= shipping.freeFrom ? 0 : shipping.fee;
  return { subtotal, shipping: fee, total: subtotal + fee, count: lines.reduce((sum, line) => sum + line.quantity, 0), toFree: Math.max(0, shipping.freeFrom - subtotal) };
}

export const SHIPPING = { fee: 6000, freeFrom: 150_000 };
