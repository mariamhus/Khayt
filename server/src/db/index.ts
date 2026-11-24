import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { env } from "../env.js";
import { DDL } from "./ddl.js";
import * as schema from "./schema.js";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

type Holder = { db?: Promise<{ db: DB; close: () => Promise<void> }> };
const holder = globalThis as unknown as { khaytDb?: Holder["db"] };

async function connect() {
  if (env.databaseUrl) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const client = postgres(env.databaseUrl, { max: 5, onnotice: () => {}, prepare: false });
    await client.unsafe(DDL);
    const db = drizzle(client, { schema }) as unknown as DB;
    await (await import("./seed.js")).ensureMainStore(db as never);
    return { db, close: () => client.end() };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dir = env.test ? undefined : process.env.VERCEL || process.env.RENDER ? "/tmp/khayt-pglite" : ".pglite";
  const client = dir ? new PGlite(dir) : new PGlite();
  await client.exec(DDL);
  const db = drizzle(client, { schema }) as unknown as DB;
  await (await import("./seed.js")).ensureMainStore(db as never);
  return { db, close: () => client.close() };
}

export async function getDb() {
  holder.khaytDb ??= connect();
  return (await holder.khaytDb).db;
}

export async function resetDb() {
  if (holder.khaytDb) await (await holder.khaytDb).close();
  holder.khaytDb = undefined;
}
