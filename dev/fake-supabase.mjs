// In-memory fake Supabase client for LOCAL testing only (dev/ directory).
// Emulates the small SDK surface the handler uses: select/eq/order/limit/
// range/maybeSingle/single/insert/update/upsert/delete on plain tables.

const clone = (v) => JSON.parse(JSON.stringify(v));

function cmp(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  const sa = String(a ?? ""), sb = String(b ?? "");
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

class FakeQuery {
  constructor(db, table) {
    this.db = db;
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
    // .select() after update/delete/upsert only requests returned columns.
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

  project(row) {
    if (!this.cols) return clone(row);
    const out = {};
    for (const c of this.cols) out[c] = row[c] === undefined ? null : clone(row[c]);
    return out;
  }

  exec() {
    const table = this.db[this.table];
    if (!table) {
      return Promise.resolve({ data: null, error: { message: `relation "${this.table}" does not exist` } });
    }
    const match = (row) => this.filters.every(([c, v]) => row[c] === v);
    let result = { data: null, error: null };

    if (this.op === "select") {
      let rows = table.filter(match).slice();
      rows.sort((a, b) => {
        for (const [col, asc] of this.orders) {
          const c = cmp(a[col], b[col]);
          if (c) return asc ? c : -c;
        }
        return 0;
      });
      if (this.rangeA != null) rows = rows.slice(this.rangeA, this.rangeB == null ? undefined : this.rangeB + 1);
      if (this.limitN != null) rows = rows.slice(0, this.limitN);
      result.data = rows.map((r) => this.project(r));
    } else if (this.op === "insert") {
      for (const row of this.payload) {
        if (row.id != null && table.some((r) => r.id === row.id)) {
          return Promise.resolve({ data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } });
        }
        table.push(clone(row));
      }
    } else if (this.op === "upsert") {
      for (const row of this.payload) {
        const i = table.findIndex((r) => r.id === row.id);
        if (i === -1) table.push(clone(row));
        else table[i] = clone(row);
      }
    } else if (this.op === "update") {
      const touched = table.filter(match);
      for (const row of touched) Object.assign(row, clone(this.payload));
      const after = table.filter(match);
      if (this.cols) {
        const rows = after.map((r) => this.project(r));
        result.data = this.mode === "maybe" ? (rows[0] || null) : rows;
      }
    } else if (this.op === "delete") {
      const removed = table.filter(match);
      this.db[this.table] = table.filter((r) => !match(r));
      if (this.cols) {
        const rows = removed.map((r) => this.project(r));
        result.data = this.mode === "maybe" ? (rows[0] || null) : rows;
      }
    }

    if (this.mode === "maybe") result.data = Array.isArray(result.data) ? (result.data[0] || null) : result.data;
    if (this.mode === "single" && Array.isArray(result.data) && result.data.length !== 1) {
      result = { data: null, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" } };
    }
    return Promise.resolve(result);
  }
}

export function newDb() {
  return {
    books: [], categories: [], bundles: [], settings: [],
    orders: [], admin_sessions: [],
  };
}

export function makeClient(db) {
  return { from: (table) => new FakeQuery(db, table) };
}
