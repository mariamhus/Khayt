import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "../src/db/index.js";
import { normalizePhone } from "../src/lib/schemas.js";
import { shippingFor } from "../src/lib/orders.js";
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD } from "../src/db/seed.js";

const app = createApp();
type Product = { id: string; slug: string; price: number; colors: { key: string }[]; sizes: string[]; inStock: boolean };
type Level = { color: string; size: string; quantity: number };

async function signUp(email: string) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/register").send({ name: "Test Shopper", email, password: "password123" });
  expect(res.status).toBe(201);
  return agent;
}

async function adminAgent() {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email: DEMO_ADMIN_EMAIL, password: DEMO_ADMIN_PASSWORD });
  expect(res.body.user.role).toBe("admin");
  return agent;
}

const address = { name: "Test Shopper", phone: "010 1234 5678", city: "Cairo", address: "12 Tahrir Street" };

async function variant(agent: ReturnType<typeof request.agent>, slug: string, min = 1) {
  const res = await agent.get(`/api/products/${slug}`);
  const level = (res.body.product.stock as Level[]).find((row) => row.quantity >= min)!;
  return { product: res.body.product as Product & { stock: Level[] }, level };
}

afterAll(async () => {
  await resetDb();
});

describe("helpers", () => {
  it("normalises phones and prices shipping", () => {
    expect(normalizePhone("٠١٠١٢٣٤٥٦٧٨")).toBe("+201012345678");
    expect(normalizePhone("12345")).toBeNull();
    expect(shippingFor(149_999)).toBe(6000);
    expect(shippingFor(150_000)).toBe(0);
  });
});

describe("catalogue", () => {
  it("lists, filters and sorts the main store", async () => {
    const all = await request(app).get("/api/products");
    expect(all.body.products).toHaveLength(11);
    expect(all.body.products[0].storeId).toBeUndefined();
    const dresses = await request(app).get("/api/products?category=dresses");
    expect(dresses.body.products.map((p: Product) => p.slug).sort()).toEqual(["classic-crepe-dress", "floral-poplin-dress", "linen-shirt-dress", "satin-puff-dress"]);
    const cheap = await request(app).get("/api/products?sort=price_asc");
    expect(cheap.body.products[0].slug).toBe("oversized-cotton-tee");
    expect((await request(app).get("/api/products?q=كتان")).body.products.length).toBeGreaterThan(0);
    expect((await request(app).get("/api/products?color=forest")).body.products.every((p: Product) => p.colors.some((c) => c.key === "forest"))).toBe(true);
    expect((await request(app).get("/api/products?q=%25")).body.products).toHaveLength(0);
    expect((await request(app).get("/api/products?category=shoes")).status).toBe(400);
  });

  it("shows a product with capped stock and related items", async () => {
    const res = await request(app).get("/api/products/fleece-hoodie");
    expect(res.body.product.stock).toHaveLength(25);
    expect(res.body.product.images.ivory).toBe("/products/hoodie-ivory.webp");
    expect(Math.max(...res.body.product.stock.map((row: Level) => row.quantity))).toBeLessThanOrEqual(10);
    expect(res.body.related).toHaveLength(4);
    expect((await request(app).get("/api/products/nope")).status).toBe(404);
  });
});

describe("checkout", () => {
  let shopper: Awaited<ReturnType<typeof signUp>>;
  let orderId = "";

  beforeAll(async () => {
    shopper = await signUp("shopper@example.com");
  });

  it("needs a session", async () => {
    expect((await request(app).post("/api/orders").send({})).status).toBe(401);
    expect((await request(app).get("/api/admin/stats")).status).toBe(401);
    expect((await shopper.get("/api/admin/stats")).status).toBe(403);
  });

  it("places an order with server prices and takes stock", async () => {
    const { product, level } = await variant(shopper, "oversized-cotton-tee", 2);
    const res = await shopper.post("/api/orders").send({ ...address, items: [{ productId: product.id, color: level.color, size: level.size, quantity: 1, unitPrice: 1 }, { productId: product.id, color: level.color, size: level.size, quantity: 1 }] });
    expect(res.status).toBe(201);
    expect(res.body.order).toMatchObject({ number: "KH-10001", status: "pending", subtotal: 110_000, shipping: 6000, total: 116_000, phone: "+201012345678" });
    expect(res.body.order.items).toHaveLength(1);
    expect(res.body.order.items[0].quantity).toBe(2);
    orderId = res.body.order.id;
    const after = await variant(shopper, "oversized-cotton-tee", 0);
    const now = after.product.stock.find((row) => row.color === level.color && row.size === level.size)!.quantity;
    expect(now).toBeLessThanOrEqual(level.quantity);
    const admin = await adminAgent();
    const full = await admin.get(`/api/admin/products/${product.id}`);
    const before = (await admin.get(`/api/admin/products/${product.id}`)).body.product.stock.find((row: Level) => row.color === level.color && row.size === level.size).quantity;
    expect(full.status).toBe(200);
    expect(before).toBeGreaterThanOrEqual(0);
  });

  it("gives free shipping over the threshold and marks card orders paid", async () => {
    const { product, level } = await variant(shopper, "satin-puff-dress");
    const res = await shopper.post("/api/orders").send({ ...address, payment: "card", items: [{ productId: product.id, color: level.color, size: level.size, quantity: 1 }] });
    expect(res.body.order).toMatchObject({ number: "KH-10002", status: "paid", shipping: 0, total: 265_000 });
  });

  it("refuses sold-out or unknown variants and changes nothing", async () => {
    const { product } = await variant(shopper, "fleece-hoodie");
    const soldOut = await shopper.post("/api/orders").send({ ...address, items: [{ productId: product.id, color: product.colors[0]!.key, size: "M", quantity: 10 }, { productId: product.id, color: "neon", size: "M", quantity: 1 }] });
    expect(soldOut.status).toBe(409);
    expect(soldOut.body.error.code).toBe("cart_changed");
    expect(soldOut.body.error.details.problems.map((p: { reason: string }) => p.reason).sort()).toEqual(["stock", "unavailable"]);
    expect((await shopper.post("/api/orders").send({ ...address, phone: "123", items: [{ productId: product.id, color: product.colors[0]!.key, size: "M", quantity: 1 }] })).body.error.fields[0].message).toBe("invalid_phone");
    expect((await shopper.get("/api/orders")).body.orders).toHaveLength(2);
  });

  it("keeps orders private to their owner", async () => {
    expect((await shopper.get(`/api/orders/${orderId}`)).status).toBe(200);
    const other = await signUp("other@example.com");
    expect((await other.get(`/api/orders/${orderId}`)).status).toBe(404);
    expect((await other.get("/api/orders")).body.orders).toHaveLength(0);
  });

  it("lets the admin move an order, and cancelling returns the stock", async () => {
    const admin = await adminAgent();
    expect((await admin.get(`/api/orders/${orderId}`)).status).toBe(200);
    const detail = (await admin.get(`/api/orders/${orderId}`)).body.order;
    const line = detail.items[0];
    const level = async () => (await admin.get(`/api/admin/products/${line.productId}`)).body.product.stock.find((row: Level) => row.color === line.color && row.size === line.size).quantity as number;
    const before = await level();
    expect((await admin.put(`/api/admin/orders/${orderId}/status`).send({ status: "shipped" })).body.order.status).toBe("shipped");
    expect(await level()).toBe(before);
    expect((await admin.put(`/api/admin/orders/${orderId}/status`).send({ status: "cancelled" })).body.order.status).toBe("cancelled");
    expect(await level()).toBe(before + 2);
    expect((await admin.put(`/api/admin/orders/${orderId}/status`).send({ status: "paid" })).body.error.code).toBe("order_cancelled");
    expect((await admin.put(`/api/admin/orders/${orderId}/status`).send({ status: "lost" })).status).toBe(400);
    const list = await admin.get("/api/admin/orders?status=cancelled");
    expect(list.body.total).toBe(1);
    expect((await admin.get("/api/admin/orders?q=KH-10002")).body.orders[0].status).toBe("paid");
  });
});

describe("admin products", () => {
  const body = {
    name: { en: "Test Linen Tee", ar: "تيشيرت كتان تجريبي" },
    description: { en: "A test.", ar: "تجربة." },
    category: "tops",
    garment: "tee",
    fabric: "linen",
    pattern: "stripe",
    price: 80_000,
    compareAt: null,
    colors: ["nile", "sand"],
    sizes: ["S", "M"],
    featured: false,
    active: true,
    stock: [{ color: "nile", size: "S", quantity: 4 }, { color: "ghost", size: "S", quantity: 9 }],
  };

  it("creates, edits, hides and deletes", async () => {
    const admin = await adminAgent();
    const created = await admin.post("/api/admin/products").send(body);
    expect(created.status).toBe(201);
    expect(created.body.product.slug).toBe("test-linen-tee");
    expect((await admin.post("/api/admin/products").send(body)).body.product.slug).toBe("test-linen-tee-2");
    const id = created.body.product.id;
    const detail = await admin.get(`/api/admin/products/${id}`);
    expect(detail.body.product.stock).toHaveLength(4);
    expect(detail.body.product.stock.reduce((sum: number, row: Level) => sum + row.quantity, 0)).toBe(4);
    expect((await request(app).get("/api/products/test-linen-tee")).body.product.colors[0].hex).toBe("#2f5d62");
    expect((await admin.put(`/api/admin/products/${id}`).send({ ...body, price: 90_000, compareAt: 85_000 })).body.error.fields[0].message).toBe("compare_not_higher");
    expect((await admin.put(`/api/admin/products/${id}`).send({ ...body, active: false })).status).toBe(200);
    expect((await request(app).get("/api/products/test-linen-tee")).status).toBe(404);
    expect((await admin.delete(`/api/admin/products/${id}`)).body.hidden).toBe(false);
    const sold = (await request(app).get("/api/products/satin-puff-dress")).body.product.id;
    expect((await admin.delete(`/api/admin/products/${sold}`)).body.hidden).toBe(true);
    expect((await request(app).get("/api/products")).body.products.some((p: Product) => p.slug === "satin-puff-dress")).toBe(false);
  });

  it("reports sales", async () => {
    const admin = await adminAgent();
    const stats = await admin.get("/api/admin/stats");
    expect(stats.body.days).toHaveLength(30);
    expect(stats.body.revenue).toBe(265_000);
    expect(stats.body.statuses).toMatchObject({ paid: 1, cancelled: 1 });
    expect(stats.body.lowStock.length).toBeGreaterThan(0);
  });
});

describe("demo sandboxes", () => {
  it("gives each visitor a private store they can shop in and manage", async () => {
    const demo = request.agent(app);
    const start = await demo.post("/api/auth/demo");
    expect(start.body.user).toMatchObject({ role: "admin", isDemo: true });
    const mine = (await demo.get("/api/products")).body.products as Product[];
    const main = (await request(app).get("/api/products")).body.products as Product[];
    expect(mine).toHaveLength(11);
    expect(mine.some((product) => main.some((other) => other.id === product.id))).toBe(false);
    const stats = await demo.get("/api/admin/stats");
    expect(stats.body.orders).toBeGreaterThan(30);
    expect(stats.body.top).toHaveLength(5);

    const target = mine.find((product) => product.slug === "oversized-cotton-tee")!;
    const edit = (await demo.get(`/api/admin/products/${target.id}`)).body.product;
    await demo.put(`/api/admin/products/${target.id}`).send({ ...edit, colors: edit.colors.map((color: { key: string }) => color.key), price: 12_300 });
    expect((await demo.get("/api/products/oversized-cotton-tee")).body.product.price).toBe(12_300);
    expect((await request(app).get("/api/products/oversized-cotton-tee")).body.product.price).toBe(55_000);

    const { product, level } = await variant(demo, "oversized-cotton-tee");
    const order = await demo.post("/api/orders").send({ ...address, items: [{ productId: product.id, color: level.color, size: level.size, quantity: 1 }] });
    expect(order.body.order.total).toBe(12_300 + 6000);
    expect((await demo.get(`/api/admin/orders?q=${order.body.order.number}`)).body.total).toBe(1);
    const admin = await adminAgent();
    expect((await admin.get(`/api/orders/${order.body.order.id}`)).status).toBe(404);
    expect((await admin.put(`/api/admin/products/${target.id}`).send({ ...edit, colors: ["nile"] })).status).toBe(404);
    const mainProduct = main[0]!;
    expect((await demo.post("/api/orders").send({ ...address, items: [{ productId: mainProduct.id, color: mainProduct.colors[0]!.key, size: mainProduct.sizes[0], quantity: 1 }] })).body.error.code).toBe("cart_changed");

    await demo.post("/api/auth/logout");
    expect((await demo.get("/api/auth/me")).status).toBe(401);
    expect((await admin.get(`/api/admin/products/${target.id}`)).status).toBe(404);
  });
});

function fakePng(width: number, height: number) {
  const buffer = Buffer.alloc(64);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

describe("product photos", () => {
  it("uploads, serves and attaches photos to products in the right store only", async () => {
    const demo = request.agent(app);
    await demo.post("/api/auth/demo");
    const upload = await demo.post("/api/admin/images").set("Content-Type", "image/png").send(fakePng(800, 1040));
    expect(upload.status).toBe(201);
    expect(upload.body).toMatchObject({ width: 800, height: 1040 });
    const url = upload.body.url as string;
    const served = await request(app).get(url);
    expect(served.headers["content-type"]).toBe("image/png");
    expect(served.headers["x-content-type-options"]).toBe("nosniff");
    expect((await demo.post("/api/admin/images").set("Content-Type", "image/png").send(Buffer.from("not an image at all, just some text padding padding")))).toMatchObject({ status: 415 });
    expect((await demo.post("/api/admin/images").set("Content-Type", "image/png").send(fakePng(20, 20))).body.error.code).toBe("bad_dimensions");
    expect((await demo.post("/api/admin/images").set("Content-Type", "text/plain").send("hello")).status).toBe(415);
    const shopper = await signUp("photos@example.com");
    expect((await shopper.post("/api/admin/images").set("Content-Type", "image/png").send(fakePng(800, 800))).status).toBe(403);

    const products = (await demo.get("/api/admin/products")).body.products as (Product & { colors: { key: string }[] })[];
    const target = products.find((product) => product.slug === "linen-shirt-dress")!;
    const edit = (await demo.get(`/api/admin/products/${target.id}`)).body.product;
    const body = { ...edit, colors: edit.colors.map((color: { key: string }) => color.key), images: { olive: url, nile: url }, swatches: { olive: url } };
    expect((await demo.put(`/api/admin/products/${target.id}`).send(body)).status).toBe(200);
    const shown = (await demo.get("/api/products/linen-shirt-dress")).body.product;
    expect(shown.images).toEqual({ olive: url });
    expect(shown.swatches).toEqual({ olive: url });
    expect((await demo.put(`/api/admin/products/${target.id}`).send({ ...body, images: { olive: "/products/dress-olive.webp" } })).status).toBe(200);
    expect((await demo.put(`/api/admin/products/${target.id}`).send({ ...body, images: { olive: "/products/../secret.webp" } })).status).toBe(400);

    const admin = await adminAgent();
    const mine = (await admin.post("/api/admin/images").set("Content-Type", "image/png").send(fakePng(600, 780))).body.url;
    expect((await demo.put(`/api/admin/products/${target.id}`).send({ ...body, images: { olive: mine } })).body.error.code).toBe("unknown_image");
    expect((await demo.put(`/api/admin/products/${target.id}`).send({ ...body, swatches: { olive: "https://evil.example/x.png" } })).status).toBe(400);
    await demo.post("/api/auth/logout");
    expect((await request(app).get(url)).status).toBe(404);
  });
});
