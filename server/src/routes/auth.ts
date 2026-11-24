import { Router } from "express";
import bcrypt from "bcryptjs";
import { and, eq, isNotNull, lt } from "drizzle-orm";
import { rateLimit } from "express-rate-limit";
import { getDb } from "../db/index.js";
import { stores, users } from "../db/schema.js";
import { seedSandbox } from "../db/seed.js";
import { endSession, mainStoreId, optionalAuth, requireAuth, startSession } from "../lib/auth.js";
import { HttpError } from "../lib/errors.js";
import { Credentials, Register } from "../lib/schemas.js";
import { demoEmail, demoPassword } from "../lib/random.js";
import { env } from "../env.js";

const limiter = (limit: number, minutes: number) => rateLimit({ windowMs: minutes * 60_000, limit: env.test ? 1000 : limit, standardHeaders: "draft-8", legacyHeaders: false, message: { error: { code: "rate_limited" } } });

let dummy: string | null = null;
const dummyHash = async () => (dummy ??= await bcrypt.hash("not-a-real-password", 10));

export const auth = Router();

auth.post("/register", limiter(10, 15), async (req, res) => {
  const input = Register.parse(req.body);
  const db = await getDb();
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email));
  if (exists) throw new HttpError(409, "email_taken");
  const [user] = await db
    .insert(users)
    .values({ storeId: await mainStoreId(), email: input.email, name: input.name, passwordHash: await bcrypt.hash(input.password, 10) })
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role, isDemo: users.isDemo });
  await startSession(res, user!.id);
  res.status(201).json({ user });
});

auth.post("/login", limiter(10, 15), async (req, res) => {
  const input = Credentials.parse(req.body);
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.email, input.email));
  const ok = user ? await bcrypt.compare(input.password, user.passwordHash) : await bcrypt.compare(input.password, await dummyHash());
  if (!user || !ok || user.isDemo) throw new HttpError(401, "invalid_credentials");
  await startSession(res, user.id);
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, isDemo: false } });
});

auth.post("/demo", limiter(6, 10), async (_req, res) => {
  const db = await getDb();
  await db.delete(stores).where(and(eq(stores.isMain, false), isNotNull(stores.expiresAt), lt(stores.expiresAt, new Date())));
  const expiresAt = new Date(Date.now() + 24 * 60 * 60_000);
  const passwordHash = await bcrypt.hash(demoPassword(), 4);
  const user = await db.transaction(async (tx) => {
    const [store] = await tx.insert(stores).values({ name: "Khayt demo", expiresAt }).returning({ id: stores.id });
    const [created] = await tx
      .insert(users)
      .values({ storeId: store!.id, email: demoEmail(), name: "Salma Nabil", passwordHash, role: "admin", isDemo: true })
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role, isDemo: users.isDemo });
    await seedSandbox(tx, store!.id);
    return created!;
  });
  await startSession(res, user.id, 24 * 60 * 60);
  res.status(201).json({ user });
});

auth.post("/logout", optionalAuth, async (req, res) => {
  if (req.user?.isDemo) {
    const db = await getDb();
    await db.delete(stores).where(and(eq(stores.id, req.user.storeId), eq(stores.isMain, false)));
  }
  endSession(res);
  res.status(204).end();
});

auth.get("/me", requireAuth, (req, res) => {
  const { storeId: _store, expiresAt: _expires, ...user } = req.user!;
  res.json({ user });
});
