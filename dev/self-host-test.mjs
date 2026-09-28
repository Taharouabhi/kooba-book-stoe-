// Self-host server test — no real database needed.
// Part A: boots server/server.mjs with the in-memory fake client and drives
//         it over real HTTP (static pages, catalog, order flow, admin APIs).
// Part B: checks server/pg-client.mjs SQL generation against a recording
//         stub pool (every query shape the handler can produce).
// Run from the project root: node dev/self-host-test.mjs
// Optional: set KBS_ADMIN_PASSWORD to also test admin login/order management.

import http from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "../server/server.mjs";
import { makeClient } from "../server/pg-client.mjs";
import { newDb, makeClient as makeFake } from "./fake-supabase.mjs";
import { SEED } from "../functions/seed.mjs";

const here = dirname(fileURLToPath(import.meta.url));
let passed = 0, failed = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { passed++; console.log("ok -", name); }
  else { failed++; console.log("FAIL -", name, extra); }
};

/* ================= Part A: HTTP server with fake client ================= */

const server = createApp({ client: makeFake(newDb()), webDir: join(here, "..", "web") });
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

console.log("== static files ==");
{
  const r = await fetch(base + "/");
  const text = await r.text();
  ok("home page 200", r.status === 200);
  ok("home is the store", text.includes('data-page="home"'));
  const admin = await fetch(base + "/admin/login.html");
  ok("admin login page served", admin.status === 200 && (await admin.text()).includes("<form"));
  const noext = await fetch(base + "/category");
  ok("extensionless page resolves", noext.status === 200);
}
{
  const r = await new Promise((resolve) => {
    http.get(base + "/%2e%2e/package.json", (res) => { res.resume(); res.on("end", () => resolve(res)); })
      .on("error", () => resolve({ statusCode: 0 }));
  });
  ok("path traversal blocked", r.statusCode !== 200);
}

console.log("== api: catalog + order flow ==");
const book = SEED.books.find((b) => b.stock > 0);
const wilaya = SEED.settings.allWilayas[0];
let createdOrder = null;
{
  const r = await fetch(base + "/functions/v1/app?action=catalog.list");
  const body = await r.json();
  ok("catalog.list 200", r.status === 200 && body.books.length === SEED.books.length);
  ok("no coverUrl leak in api", body.books.every((b) => !("coverUrl" in b)));

  const order = {
    name: "محمد أمين", phone: "0555123456", wilaya, city: "القبة",
    address: "شارع الاستقلال رقم 12", note: "", delivery: "home", payment: "cod",
    items: [{ id: book.id, type: "book", qty: 1 }],
  };
  const r2 = await fetch(base + "/functions/v1/app?action=order.create", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(order),
  });
  const body2 = await r2.json();
  ok("order.create 201", r2.status === 201 && /^KB-\d{6}$/.test(body2.order.ref), JSON.stringify(body2));
  createdOrder = body2.order;

  const r3 = await fetch(base + "/functions/v1/app?action=catalog.list");
  const body3 = await r3.json();
  ok("stock decremented", body3.books.find((b) => b.id === book.id).stock === book.stock - 1);
}
{
  const r = await fetch(base + "/functions/v1/app?action=nope");
  ok("unknown action 404", r.status === 404);
  const r2 = await fetch(base + "/functions/v1/app?action=admin.orders");
  ok("admin without token 401", r2.status === 401);
}

console.log("== api: admin (needs KBS_ADMIN_PASSWORD) ==");
if (process.env.KBS_ADMIN_PASSWORD) {
  const login = await fetch(base + "/functions/v1/app?action=admin.login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "admin@koubabookstore.dz", password: process.env.KBS_ADMIN_PASSWORD }),
  });
  const lbody = await login.json();
  ok("admin login 200", login.status === 200 && lbody.token);
  const H = { "x-kbs-admin": lbody.token, "content-type": "application/json" };

  const orders = await (await fetch(base + "/functions/v1/app?action=admin.orders", { headers: H })).json();
  ok("admin.orders sees the order", orders.orders.length === 1 && orders.orders[0].ref === createdOrder.ref);

  const orderId = orders.orders[0].id;
  const up = await fetch(base + "/functions/v1/app?action=admin.order.setStatus", {
    method: "POST", headers: H, body: JSON.stringify({ id: orderId, status: "proc" }),
  });
  ok("setStatus ok", up.status === 200 && (await up.json()).ok === true);

  const stats = await (await fetch(base + "/functions/v1/app?action=admin.stats", { headers: H })).json();
  ok("stats counts", stats.counts.all === 1 && stats.counts.proc === 1, JSON.stringify(stats.counts));

  const bad = await fetch(base + "/functions/v1/app?action=admin.books.save", {
    method: "POST", headers: H, body: JSON.stringify({ book: { id: "bad id!", title: "" } }),
  });
  ok("invalid book rejected", bad.status === 400);
} else {
  console.log("skipped (set KBS_ADMIN_PASSWORD to run admin checks)");
}

server.closeAllConnections?.();
server.close();

/* ================= Part B: pg adapter SQL against a stub ================= */

console.log("== pg adapter SQL ==");
const calls = [];
const stub = {
  query: async (sql, params) => {
    calls.push({ sql, params });
    if (/^SELECT/.test(sql) && sql.includes('"books"')) return { rows: [{ id: "b1", data: JSON.stringify({ title: "كتاب", stock: 4 }), sort: 0 }] };
    if (/^SELECT/.test(sql)) return { rows: [] };
    if (/RETURNING "id", "status"/.test(sql)) {
      return { rows: params.includes("x") ? [{ id: "x", status: "proc" }] : [] };
    }
    if (/RETURNING "id"/.test(sql)) return { rows: [{ id: "b1" }] };
    return { rows: [] };
  },
};
const pg = makeClient(stub);
{
  const r = await pg.from("books").select("id,data,sort").order("sort", { ascending: true }).order("id");
  ok("select sql", r.data.length === 1 && r.data[0].data.title === "كتاب", calls.at(-1).sql);
  ok("jsonb parsed", typeof r.data[0].data === "object");
}
{
  const r = await pg.from("settings").select("id,data").eq("id", "store").maybeSingle();
  ok("maybeSingle empty -> null", r.data === null && r.error === null);
  ok("eq param", calls.at(-1).sql.includes('"id" = $1') && calls.at(-1).params[0] === "store");
}
{
  const order = { id: "9a2b-uuid", ref: "KB-100001", customer_name: "سارة", customer_phone: "0555", wilaya: "وهران", items: [{ id: "b1", qty: 2 }], created_at: "2026-09-29T10:00:00Z" };
  const r = await pg.from("orders").insert(order);
  ok("insert orders sql", calls.at(-1).sql.startsWith('INSERT INTO "orders"') && calls.at(-1).sql.includes("::jsonb"));
  ok("insert orders params", calls.at(-1).params[calls.at(-1).params.length - 2] === JSON.stringify(order.items));
  ok("insert without returning -> null data", r.data === null && r.error === null);
}
{
  await pg.from("settings").upsert({ id: "admin", data: { hash: "ab".repeat(32) } });
  const c = calls.at(-1);
  ok("upsert conflict sql", c.sql.includes('ON CONFLICT ("id") DO UPDATE SET "data" = EXCLUDED."data"'));
  await pg.from("books").upsert({ id: "b1", data: { stock: 1 }, sort: 5 });
  ok("upsert multi-col", calls.at(-1).sql.includes('"data" = EXCLUDED."data", "sort" = EXCLUDED."sort"'));
}
{
  await pg.from("books").update({ data: { stock: 3 } }).eq("id", "b1");
  const c = calls.at(-1);
  ok("update jsonb sql", c.sql.startsWith('UPDATE "books" SET "data" = $1::jsonb WHERE "id" = $2'));
  const r = await pg.from("orders").update({ status: "proc" }).eq("id", "x").select("id,status").maybeSingle();
  ok("update returning maybeSingle", r.data && r.data.status === "proc");
}
{
  const r = await pg.from("books").delete().eq("id", "b1").select("id").maybeSingle();
  ok("delete returning", r.data && r.data.id === "b1");
  const none = await pg.from("orders").update({ status: "done" }).eq("id", "missing").select("id,status").maybeSingle();
  ok("update no match -> null (404 path)", none.data === null && none.error === null);
}
{
  const failing = makeClient({ query: async () => { throw Object.assign(new Error("dup"), { code: "23505" }); } });
  const r = await failing.from("books").insert({ id: "b1", data: {}, sort: 0 });
  ok("pg error surfaced as {error}", r.data === null && r.error && r.error.code === "23505");
  const unknown = await pg.from("hack").select("*");
  ok("unknown table blocked", unknown.error && calls.every((c) => !c.sql.includes('"hack"')));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
