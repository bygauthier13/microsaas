/**
 * Database access.
 *
 * - Production / any real deployment: set DATABASE_URL to a Postgres database (Neon, Supabase,
 *   RDS…). Uses node-postgres.
 * - Local development & demo with zero setup: if DATABASE_URL is not set we start an embedded
 *   Postgres (PGlite, Postgres 17 compiled to WASM) persisted in `.data/pglite`.
 *
 * Both run the same SQL migrations from `./drizzle`.
 */
import fs from "node:fs";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const globalForDb = globalThis as unknown as {
  __repairclockDb?: Promise<DB>;
  __repairclockDbKind?: "postgres" | "pglite";
};

function migrationsFolder(): string {
  return path.join(process.cwd(), "drizzle");
}

function shouldUseSsl(url: string): boolean {
  if (process.env.DATABASE_SSL === "false") return false;
  if (process.env.DATABASE_SSL === "true") return true;
  return !/localhost|127\.0\.0\.1/.test(url);
}

async function init(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  const autoMigrate = process.env.DB_AUTO_MIGRATE !== "false";

  if (url) {
    const [{ Pool }, { drizzle }, { migrate }] = await Promise.all([
      import("pg"),
      import("drizzle-orm/node-postgres"),
      import("drizzle-orm/node-postgres/migrator"),
    ]);
    const pool = new Pool({
      connectionString: url,
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      ssl: shouldUseSsl(url) ? { rejectUnauthorized: false } : undefined,
    });
    const db = drizzle(pool, { schema });
    if (autoMigrate) await migrate(db, { migrationsFolder: migrationsFolder() });
    globalForDb.__repairclockDbKind = "postgres";
    return db as unknown as DB;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "DATABASE_URL is not set. On Vercel the app needs a Postgres database: add one under Storage (Neon) or set DATABASE_URL in Settings → Environment Variables, then redeploy.",
    );
  }
  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
  ]);
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  acquirePgliteLock(dir);
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: migrationsFolder() });
  globalForDb.__repairclockDbKind = "pglite";
  return db as unknown as DB;
}

/**
 * The embedded database is single-process: two processes opening the same directory can
 * corrupt it. A pid lock file makes a second process (e.g. a CLI script while `next dev` is
 * running) fail fast with a clear message instead.
 */
function acquirePgliteLock(dir: string) {
  const lockPath = `${dir}.lock`;
  try {
    const holder = Number(fs.readFileSync(lockPath, "utf8"));
    if (holder && holder !== process.pid) {
      let alive = false;
      try {
        process.kill(holder, 0);
        alive = true;
      } catch {
        alive = false;
      }
      if (alive) {
        throw new Error(
          `The embedded database (${dir}) is in use by another process (pid ${holder}). Stop that process first, ` +
            "use the HTTP endpoint instead (e.g. GET /api/cron/daily), or set DATABASE_URL to a Postgres database.",
        );
      }
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  fs.writeFileSync(lockPath, String(process.pid));
  process.once("exit", () => {
    try {
      if (fs.readFileSync(lockPath, "utf8") === String(process.pid)) fs.unlinkSync(lockPath);
    } catch {
      // already gone
    }
  });
}

/** Shared database handle (one per process). */
export function getDb(): Promise<DB> {
  if (!globalForDb.__repairclockDb) {
    globalForDb.__repairclockDb = init().catch((err) => {
      globalForDb.__repairclockDb = undefined;
      throw err;
    });
  }
  return globalForDb.__repairclockDb;
}

export function databaseKind(): "postgres" | "pglite" | "uninitialised" {
  return globalForDb.__repairclockDbKind ?? "uninitialised";
}

export { schema };
