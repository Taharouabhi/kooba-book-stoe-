// PostgreSQL-backed implementation of the small database client interface
// functions/handler.mjs was written against (originally Supabase).
// Translates select/eq/order/limit/range/maybeSingle/single/insert/update/
// upsert/delete chains into parameterized SQL on a node-postgres pool.
// Never logs credentials; provider errors stay behind the handler's codes.

import pg from "pg";

const TABLES = ["books", "categories", "bundles", "settings", "orders", "admin_sessions"];

const JSONB_COLS = {
  books: new Set(["data"]),
  categories: new Set(["data"]),
  bundles: new Set(["data"]),
  settings: new Set(["data"]),
  orders: new Set(["items"]),
  admin_sessions: new Set(),
};

const fail = (code, message) => ({ data: null, error: { code, message } });

function paramFor(table, col, value, index) {
  const expr = `$${index}`;
  return JSONB_COLS[table]?.has(col) ? `${expr}::jsonb` : expr;
}

function coerceParam(table, col, value) {
  if (value != null && JSONB_COLS[table]?.has(col) && typeof value !== "string") {
    return JSON.stringify(value);
  }
  return value;
}

function parseRow(table, row) {
  const jsonb = JSONB_COLS[table];
  if (!jsonb) return row;
  for (const col of jsonb) {
    if (typeof row[col] === "string") {
      try { row[col] = JSON.parse(row[col]); } catch { /* leave as text */ }
    }
  }
  return row;
}

export class PgQuery {
  constructor(pool, table) {
    this.pool = pool;
    this.table = table;
    this.op = null;
    this.filters = [];
    this.orders = [];
    this.limitN = null;
    this.rangeA = null;
    this.rangeB = null;
    this.cols = null;
    this.mode = "many";
    this.payload = null;
  }

  select(cols) {
    if (this.op === null) this.op = "select";
    if (typeof cols === "string") this.cols = cols.split(",").map((s) => s.trim());
    return this;
  }
  eq(col, val) { this.filters.push([col, val]); return this; }
  order(col, opts) { this.orders.push([col, !(opts && opts.ascending === false)]); return this; }
  limit(n) { this.limitN = n; return this; }
  range(a, b) { this.rangeA = a; this.rangeB = b; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  single() { this.mode = "single"; return this; }
  insert(rows) { this.op = "insert"; this.payload = Array.isArray(rows) ? rows : [rows]; return this; }
  update(obj) { this.op = "update"; this.payload = obj; return this; }
  upsert(rows) { this.op = "upsert"; this.payload = Array.isArray(rows) ? rows : [rows]; return this; }
  delete() { this.op = "delete"; return this; }
  then(resolve, reject) { return this.exec().then(resolve, reject); }
  catch(reject) { return this.exec().catch(reject); }

  where(params) {
    if (!this.filters.length) return "";
    return " WHERE " + this.filters.map(([col, val]) => {
      params.push(coerceParam(this.table, col, val));
      return `"${col}" = ${paramFor(this.table, col, val, params.length)}`;
    }).join(" AND ");
  }

  orderSql() {
    if (!this.orders.length) return "";
    return " ORDER BY " + this.orders.map(([col, asc]) => `"${col}" ${asc ? "ASC" : "DESC"}`).join(", ");
  }

  limitSql() {
    if (this.rangeA != null) {
      const span = this.rangeB != null ? this.rangeB - this.rangeA + 1 : "ALL";
      return ` LIMIT ${span} OFFSET ${this.rangeA}`;
    }
    return this.limitN != null ? ` LIMIT ${this.limitN}` : "";
  }

  returningSql() {
    return this.cols ? ` RETURNING ${this.cols.map((c) => `"${c}"`).join(", ")}` : "";
  }

  shape(rows) {
    let data = rows;
    if (this.mode === "maybe") data = rows[0] ?? null;
    if (this.mode === "single") {
      if (rows.length !== 1) return fail("PGRST116", "single row expected");
      data = rows[0];
    }
    return { data, error: null };
  }

  async exec() {
    if (!TABLES.includes(this.table)) {
      return fail("42P01", `relation "${this.table}" does not exist`);
    }
    if (!this.op || !this.payload && (this.op === "insert" || this.op === "upsert" || this.op === "update")) {
      return fail("42601", "incomplete query");
    }
    const params = [];
    try {
      if (this.op === "select") {
        const cols = this.cols ? this.cols.map((c) => `"${c}"`).join(", ") : "*";
        const { rows } = await this.pool.query(
          `SELECT ${cols} FROM "${this.table}"${this.where(params)}${this.orderSql()}${this.limitSql()}`,
          params,
        );
        return this.shape(rows.map((r) => parseRow(this.table, r)));
      }

      if (this.op === "insert" || this.op === "upsert") {
        const cols = [...new Set(this.payload.flatMap((r) => Object.keys(r)))];
        const values = this.payload.map((row) =>
          `(${cols.map((c) => {
            params.push(coerceParam(this.table, c, row[c]));
            return paramFor(this.table, c, row[c], params.length);
          }).join(", ")})`,
        );
        let sql = `INSERT INTO "${this.table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES ${values.join(", ")}`;
        if (this.op === "upsert") {
          const updates = cols.filter((c) => c !== "id").map((c) => `"${c}" = EXCLUDED."${c}"`);
          sql += updates.length
            ? ` ON CONFLICT ("id") DO UPDATE SET ${updates.join(", ")}`
            : ` ON CONFLICT ("id") DO NOTHING`;
        }
        const { rows } = await this.pool.query(sql + this.returningSql(), params);
        if (!this.cols) return { data: null, error: null };
        return this.shape(rows.map((r) => parseRow(this.table, r)));
      }

      if (this.op === "update") {
        const cols = Object.keys(this.payload);
        const sets = cols.map((c) => {
          params.push(coerceParam(this.table, c, this.payload[c]));
          return `"${c}" = ${paramFor(this.table, c, this.payload[c], params.length)}`;
        });
        const { rows } = await this.pool.query(
          `UPDATE "${this.table}" SET ${sets.join(", ")}${this.where(params)}${this.returningSql()}`,
          params,
        );
        if (!this.cols) return { data: null, error: null };
        return this.shape(rows.map((r) => parseRow(this.table, r)));
      }

      if (this.op === "delete") {
        const { rows } = await this.pool.query(
          `DELETE FROM "${this.table}"${this.where(params)}${this.returningSql()}`,
          params,
        );
        if (!this.cols) return { data: null, error: null };
        return this.shape(rows.map((r) => parseRow(this.table, r)));
      }

      return fail("42601", "unsupported operation");
    } catch (e) {
      return fail(e.code || "XX000", "database error");
    }
  }
}

export function makeClient(pool) {
  return { from: (table) => new PgQuery(pool, table) };
}

export function connect(databaseUrl) {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 8 });
  return { pool, client: makeClient(pool) };
}
