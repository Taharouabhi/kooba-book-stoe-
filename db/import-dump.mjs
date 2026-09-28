// Loads db-dump/*.json (created by dev/build-dump.mjs) into a PostgreSQL
// database. Creates the tables if they are missing. Rows whose id already
// exists are skipped, so running this twice is safe.
//
// Usage (from the project root, after `npm install`):
//   DATABASE_URL=postgres://user:password@host:5432/database node db/import-dump.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const dumpDir = join(dirname(fileURLToPath(import.meta.url)), "..", "db-dump");

const DDL = `
CREATE TABLE IF NOT EXISTS books (
  id   text PRIMARY KEY,
  data jsonb NOT NULL,
  sort integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS categories (
  id   text PRIMARY KEY,
  data jsonb NOT NULL,
  sort integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS bundles (
  id   text PRIMARY KEY,
  data jsonb NOT NULL,
  sort integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS settings (
  id   text PRIMARY KEY,
  data jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id              uuid PRIMARY KEY,
  ref             text NOT NULL,
  customer_name   text NOT NULL,
  customer_phone  text NOT NULL,
  wilaya          text NOT NULL,
  city            text NOT NULL DEFAULT '',
  address         text NOT NULL DEFAULT '',
  note            text NOT NULL DEFAULT '',
  items           jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal        integer NOT NULL DEFAULT 0,
  shipping        integer NOT NULL DEFAULT 0,
  total           integer NOT NULL DEFAULT 0,
  delivery_method text NOT NULL DEFAULT 'home',
  payment_method  text NOT NULL DEFAULT 'cod',
  status          text NOT NULL DEFAULT 'new',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_sessions (
  id         uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
`;

// table name -> [column list]; JSON columns are listed in JSON_COLS.
const TABLES = {
  books: ["id", "data", "sort"],
  categories: ["id", "data", "sort"],
  bundles: ["id", "data", "sort"],
  settings: ["id", "data"],
  orders: [
    "id", "ref", "customer_name", "customer_phone", "wilaya", "city", "address",
    "note", "items", "subtotal", "shipping", "total",
    "delivery_method", "payment_method", "status", "created_at",
  ],
};
const JSON_COLS = new Set(["data", "items"]);

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Example:");
    console.error("  DATABASE_URL=postgres://kbs:YOUR-PASSWORD@127.0.0.1:5432/kouba_books node db/import-dump.mjs");
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    await pool.query(DDL);
    for (const [table, cols] of Object.entries(TABLES)) {
      const rows = JSON.parse(readFileSync(join(dumpDir, table + ".json"), "utf8"));
      if (!rows.length) { console.log(`${table}: 0 rows (skipped)`); continue; }
      const colList = cols.map((c) => `"${c}"`).join(", ");
      let inserted = 0;
      for (const row of rows) {
        const values = cols.map((c, i) => {
          const v = row[c] === undefined ? null : row[c];
          return JSON_COLS.has(c) ? `$${i + 1}::jsonb` : `$${i + 1}`;
        });
        const params = cols.map((c) => (JSON_COLS.has(c) ? JSON.stringify(row[c] ?? null) : row[c] ?? null));
        const r = await pool.query(
          `INSERT INTO "${table}" (${colList}) VALUES (${values.join(", ")}) ON CONFLICT (id) DO NOTHING`,
          params,
        );
        inserted += r.rowCount ?? 0;
      }
      console.log(`${table}: ${inserted}/${rows.length} rows imported`);
    }
    console.log("Import finished.");
  } catch (e) {
    console.error("Import failed:", e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
