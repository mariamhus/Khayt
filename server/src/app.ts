import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./env.js";
import { optionalAuth, requireAdmin, requireAuth, sameOrigin } from "./lib/auth.js";
import { errorHandler, routeNotFound } from "./lib/errors.js";
import { auth } from "./routes/auth.js";
import { catalog } from "./routes/catalog.js";
import { orderRoutes } from "./routes/orders.js";
import { admin } from "./routes/admin.js";
import { getDb } from "./db/index.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", env.trustProxy);
  app.disable("x-powered-by");
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "same-site" } }));
  app.use(cors({ origin: env.clientOrigins, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.get("/api/health", async (_req, res) => {
    await getDb();
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.use("/api", sameOrigin);
  app.use("/api/auth", auth);
  app.use("/api/orders", requireAuth, orderRoutes);
  app.use("/api/admin", requireAdmin, admin);
  app.use("/api", optionalAuth, catalog);
  app.use(routeNotFound);
  app.use(errorHandler);
  return app;
}
