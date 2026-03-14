/**
 * Ensures the target database exists before running Prisma migrate deploy.
 * Connects to the `postgres` database, creates the target DB if missing.
 *
 * Env: DATABASE_URL (full connection string to the target DB)
 * Usage: tsx scripts/ensure-database.ts
 *
 * Use before prisma migrate deploy when the init script is not used
 * (e.g. fresh Postgres without 01-create-databases.sh).
 */

import { Client } from "pg";

function parseDatabaseUrl(url: string): { database: string; postgresUrl: string } {
  try {
    const parsed = new URL(url);
    const database = parsed.pathname.slice(1) || "postgres";
    parsed.pathname = "/postgres";
    const postgresUrl = parsed.toString().replace(/^postgres:/, "postgresql:");
    return { database, postgresUrl };
  } catch (err) {
    throw new Error(`Invalid DATABASE_URL: ${err}`);
  }
}

async function ensureDatabase(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const { database, postgresUrl } = parseDatabaseUrl(url);
  if (database === "postgres") {
    return; // default DB always exists
  }

  const client = new Client({ connectionString: postgresUrl });
  try {
    await client.connect();
  } catch (err) {
    console.error(
      "Cannot connect to Postgres. Is it running? Use docker-compose up -d postgres."
    );
    process.exit(1);
  }

  try {
    const res = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [database]
    );
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${database}"`);
      console.log(`Database "${database}" created.`);
    }
  } finally {
    await client.end();
  }
}

ensureDatabase().catch((err) => {
  console.error(err);
  process.exit(1);
});
