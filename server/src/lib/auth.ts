import type { Request, RequestHandler, Response } from "express";
import { eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { env } from "../env.js";
import { getDb } from "../db/index.js";
import { stores, users } from "../db/schema.js";
import { HttpError } from "./errors.js";

export const COOKIE = "khayt_session";
const key = new TextEncoder().encode(env.jwtSecret);
const MAX_AGE = 7 * 24 * 60 * 60;

export type AuthUser = { id: string; email: string; name: string; isDemo: boolean; role: string; storeId: string; expiresAt: Date | null };

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

export async function startSession(res: Response, userId: string, maxAge = MAX_AGE) {
  const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setIssuedAt().setExpirationTime(`${maxAge}s`).sign(key);
  res.cookie(COOKIE, token, { httpOnly: true, secure: env.production, sameSite: "lax", path: "/", maxAge: maxAge * 1000 });
}

export function endSession(res: Response) {
  res.clearCookie(COOKIE, { httpOnly: true, secure: env.production, sameSite: "lax", path: "/" });
}

async function userFrom(req: Request) {
  const token = req.cookies?.[COOKIE];
  if (typeof token !== "string" || !token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    const db = await getDb();
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, isDemo: users.isDemo, role: users.role, storeId: users.storeId, expiresAt: stores.expiresAt })
      .from(users)
      .innerJoin(stores, eq(stores.id, users.storeId))
      .where(eq(users.id, payload.sub));
    if (!user) return null;
    if (user.expiresAt && user.expiresAt.getTime() < Date.now()) return null;
    return user;
  } catch {
    return null;
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const user = await userFrom(req);
  if (!user) throw new HttpError(401, "unauthorized");
  req.user = user;
  next();
};

export const optionalAuth: RequestHandler = async (req, _res, next) => {
  req.user = (await userFrom(req)) ?? undefined;
  next();
};

export const sameOrigin: RequestHandler = (req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (origin) {
    const host = `${req.protocol}://${req.get("host")}`;
    const allowed = origin === host || env.clientOrigins.includes(origin) || (!env.production && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
    if (!allowed) throw new HttpError(403, "bad_origin");
  }
  if (req.headers["content-length"] && req.headers["content-length"] !== "0" && !req.is(["application/json", "image/png", "image/jpeg", "image/webp"])) throw new HttpError(415, "json_only");
  next();
};

export const requireAdmin: RequestHandler = async (req, _res, next) => {
  const user = await userFrom(req);
  if (!user) throw new HttpError(401, "unauthorized");
  if (user.role !== "admin") throw new HttpError(403, "forbidden");
  req.user = user;
  next();
};

let mainStore: string | null = null;

export async function mainStoreId() {
  if (mainStore) return mainStore;
  const db = await getDb();
  const [row] = await db.select({ id: stores.id }).from(stores).where(eq(stores.isMain, true));
  if (!row) throw new HttpError(500, "no_store");
  mainStore = row.id;
  return mainStore;
}

export const forgetMainStore = () => {
  mainStore = null;
};

export const storeOf = async (req: Request) => req.user?.storeId ?? (await mainStoreId());

export const userId = (req: Request) => req.user!.id;
