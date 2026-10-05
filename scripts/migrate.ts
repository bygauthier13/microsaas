/**
 * Apply database migrations (uses DATABASE_URL if set, otherwise the local embedded database).
 *   npm run db:migrate
 */
import { getDb, databaseKind } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  const res = await db.execute(sql`select count(*)::int as n from information_schema.tables where table_schema = 'public'`);
  // eslint-disable-next-line no-console
  console.log(`Migrations applied (${databaseKind()}). Public tables:`, (res as unknown as { rows: Array<{ n: number }> }).rows?.[0]?.n ?? res);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
