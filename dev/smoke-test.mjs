// LOCAL smoke test: runs the real handler against the in-memory fake DB.
// Usage: node dev/smoke-test.mjs
import assert from "node:assert/strict";
import { handleApp } from "../functions/handler.mjs";
import { SEED } from "../functions/seed.mjs";
import { newDb, makeClient } from "./fake-supabase.mjs";

const BOOTSTRAP_PASSWORD = process.env.KBS_ADMIN_PASSWORD;
if (!BOOTSTRAP_PASSWORD) {
  console.error("Set KBS_ADMIN_PASSWORD (the admin password) before running the smoke test.");
  process.exit(1);
}
const db = newDb();
let passed = 0;

async function call(method, action, body, headers = {}) {
  const url = `http://local/functions/v1/app?action=${encodeURIComponent(action)}`;
  const init = { method, headers: { ...headers } };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers["content-type"] = "application/json";
  }
  const res = await handleApp({ request: new Request(url, init), supabase: makeClient(db) });
  let parsed = null;
  try { parsed = await res.json(); } catch { /* keep null */ }
  return { status: res.status, body: parsed };
}

const ok = (name, cond, extra) => {
  if (!cond) {
    console.error(`FAIL: ${name}`, extra ?? "");
    process.exit(1);
  }
  passed += 1;
  console.log(`  ok ${passed}. ${name}`);
};

console.log("== catalog ==");
{
  const r = await call("GET", "catalog.list");
  ok("catalog.list 200", r.status === 200, r);
  ok("books seeded", r.body.books.length === SEED.books.length, r.body.books?.length);
  ok("categories seeded", r.body.categories.length === SEED.categories.length);
  ok("bundles seeded", r.body.bundles.length === SEED.bundles.length);
  ok("settings seeded", r.body.settings.wilayas?.length > 0 && Array.isArray(r.body.settings.allWilayas));
  ok("books have no coverUrl", r.body.books.every((b) => !("coverUrl" in b)));
}

console.log("== order.create ==");
const b1 = SEED.books.find((b) => b.id === "b1");
const alg = SEED.settings.wilayas.find((w) => w.name === "الجزائر");
{
  const r = await call("POST", "order.create", {
    name: "محمد أمين", phone: "0555 12 34 56", wilaya: "الجزائر", city: "القبة",
    address: "شارع الاستقلال رقم 12", note: "", delivery: "home", payment: "cod",
    items: [{ id: "b1", type: "book", qty: 2 }],
  });
  ok("order 201", r.status === 201, r);
  ok("ref format", /^KB-\d{6}$/.test(r.body.order.ref), r.body.order.ref);
  const sub = b1.price * 2;
  ok("server subtotal", r.body.order.subtotal === sub, r.body.order.subtotal);
  ok("shipping rate", r.body.order.shipping === alg.home, r.body.order.shipping);
  ok("total", r.body.order.total === sub + alg.home);
  ok("status new", r.body.order.status === "new");
  ok("no raw DB columns leaked", !("customer_name" in r.body.order) && !("created_at" in r.body.order));

  const cat = await call("GET", "catalog.list");
  ok("stock decremented", cat.body.books.find((b) => b.id === "b1").stock === b1.stock - 2);
}
{
  const r = await call("POST", "order.create", { name: "x", phone: "123", wilaya: "", city: "", address: "", items: [] });
  ok("invalid order rejected", r.status === 400 && typeof r.body.error === "string", r);
}
{
  const r = await call("POST", "order.create", {
    name: "سارة", phone: "0555111222", wilaya: "وهران", city: "وهران",
    address: "حي المعارف رقم 3", delivery: "office", payment: "ccp",
    items: [{ id: "b2", type: "book", qty: 1 }, { id: "pk1", type: "bundle", qty: 1 }],
  });
  const b2 = SEED.books.find((b) => b.id === "b2");
  const pk1 = SEED.bundles.find((b) => b.id === "pk1");
  const oran = SEED.settings.wilayas.find((w) => w.name === "وهران");
  const sub = b2.price + pk1.price;
  ok("multi-item order 201", r.status === 201, r);
  ok("office rate", r.body.order.shipping === (sub >= 3000 ? 0 : oran.office), r.body.order.shipping);
  ok("bundle item titled", r.body.order.items.some((i) => i.type === "bundle" && i.title === pk1.name));
}

console.log("== admin auth ==");
let token = "";
{
  const bad = await call("POST", "admin.login", { email: "admin@koubabookstore.dz", password: "wrong" });
  ok("bad login 401", bad.status === 401 && bad.body.error === "invalid_credentials", bad);
  const badEmail = await call("POST", "admin.login", { email: "hacker@x.com", password: BOOTSTRAP_PASSWORD });
  ok("wrong email 401", badEmail.status === 401);
  const r = await call("POST", "admin.login", { email: "admin@koubabookstore.dz", password: BOOTSTRAP_PASSWORD });
  ok("login 200", r.status === 200 && r.body.token, r);
  token = r.body.token;
  const s = await call("GET", "admin.session", undefined, { "x-kbs-admin": token });
  ok("session valid", s.status === 200 && s.body.email === "admin@koubabookstore.dz", s);
  const noAuth = await call("GET", "admin.orders");
  ok("orders without token 401", noAuth.status === 401, noAuth);
  const fakeTok = await call("GET", "admin.orders", undefined, { "x-kbs-admin": "123e4567-e89b-12d3-a456-426614174000" });
  ok("unknown token 401", fakeTok.status === 401);
}
const H = { "x-kbs-admin": token };

console.log("== admin orders & stats ==");
let orderId = "";
{
  const r = await call("GET", "admin.orders", undefined, H);
  ok("orders list", r.status === 200 && r.body.orders.length === 2, r.body.orders?.length);
  const first = r.body.orders[0];
  ok("order fields mapped", first.name && first.delivery && first.items.length > 0 && first.createdAt, first);
  orderId = r.body.orders.find((o) => o.status === "new").id;

  const bad = await call("POST", "admin.order.setStatus", { id: orderId, status: "zzz" }, H);
  ok("bad status 400", bad.status === 400);
  const nf = await call("POST", "admin.order.setStatus", { id: "123e4567-e89b-12d3-a456-426614174000", status: "done" }, H);
  ok("unknown order 404", nf.status === 404);
  const up = await call("POST", "admin.order.setStatus", { id: orderId, status: "proc" }, H);
  ok("set status ok", up.status === 200 && up.body.status === "proc", up);

  const st = await call("GET", "admin.stats", undefined, H);
  ok("stats counts", st.body.counts.all === 2 && st.body.counts.proc === 1 && st.body.counts.new === 1, st.body.counts);
  ok("stats chart 7 days", Array.isArray(st.body.chart) && st.body.chart.length === 7);
  ok("stats books count", st.body.booksCount === SEED.books.length);
  ok("stats recent", st.body.recent.length === 2);
}

console.log("== admin catalog edits ==");
{
  const r = await call("POST", "admin.books.save", {
    book: { ...b1, price: 999, stock: 3 },
  }, H);
  ok("book save", r.status === 200 && r.body.item.price === 999, r);
  const cat = await call("GET", "catalog.list");
  ok("saved price visible to catalog", cat.body.books.find((b) => b.id === "b1").price === 999);

  const del = await call("POST", "admin.books.delete", { id: "no-such-book" }, H);
  ok("delete unknown 404", del.status === 404);

  const invalid = await call("POST", "admin.books.save", { book: { id: "bad id!", title: "", author: "" } }, H);
  ok("invalid book 400", invalid.status === 400);

  const catr = await call("POST", "admin.categories.save", {
    category: { id: "test-cat", name: "تصنيف تجريبي", icon: "atom", image: "cat-sciences.png", count: 5 },
  }, H);
  ok("category save", catr.status === 200);
  const cat2 = await call("GET", "catalog.list");
  ok("category visible", cat2.body.categories.some((c) => c.id === "test-cat"));
  const catDel = await call("POST", "admin.categories.delete", { id: "test-cat" }, H);
  ok("category delete", catDel.status === 200);

  const pkr = await call("POST", "admin.bundles.save", {
    bundle: { id: "pk-test", name: "باقة تجريبية", price: 1500, covers: ["cover-1.png"], bookIds: ["b1", "b2"], save: 10 },
  }, H);
  ok("bundle save", pkr.status === 200 && pkr.body.item.count === 2, pkr);
  const pkDel = await call("POST", "admin.bundles.delete", { id: "pk-test" }, H);
  ok("bundle delete", pkDel.status === 200);

  const st = await call("POST", "admin.settings.save", {
    settings: { ...SEED.settings, phone: "0770 99 88 77" },
  }, H);
  ok("settings save", st.status === 200 && st.body.settings.phone === "0770 99 88 77", st);
}

console.log("== out of stock ==");
{
  const b9 = SEED.books.find((b) => b.id === "b9");
  await call("POST", "admin.books.save", { book: { ...b9, stock: 0 } }, H);
  const r = await call("POST", "order.create", {
    name: "عبد الله", phone: "0666111222", wilaya: "سطيف", city: "سطيف",
    address: "حي 1000 مسكن", delivery: "home", payment: "cod",
    items: [{ id: "b9", type: "book", qty: 1 }],
  });
  ok("out_of_stock rejected", r.status === 400 && r.body.error === "out_of_stock", r);
}

console.log("== password change ==");
{
  const bad = await call("POST", "admin.password.change", { current: "nope", next: "NewPassword123" }, H);
  ok("wrong current 401", bad.status === 401);
  const weak = await call("POST", "admin.password.change", { current: BOOTSTRAP_PASSWORD, next: "short" }, H);
  ok("short next 400", weak.status === 400 && weak.body.error === "invalid_password");
  const r = await call("POST", "admin.password.change", { current: BOOTSTRAP_PASSWORD, next: "NewPassword12345" }, H);
  ok("change ok", r.status === 200, r);
  const oldLogin = await call("POST", "admin.login", { email: "admin@koubabookstore.dz", password: BOOTSTRAP_PASSWORD });
  ok("old password rejected", oldLogin.status === 401);
  const newLogin = await call("POST", "admin.login", { email: "admin@koubabookstore.dz", password: "NewPassword12345" });
  ok("new password works", newLogin.status === 200 && newLogin.body.token);
  const lo = await call("POST", "admin.logout", undefined, { "x-kbs-admin": token });
  ok("logout", lo.status === 200);
  const after = await call("GET", "admin.session", undefined, { "x-kbs-admin": token });
  ok("session revoked after logout", after.status === 401);
}

console.log("== unknown action ==");
{
  const r = await call("GET", "nope");
  ok("unknown 404", r.status === 404);
}

console.log(`\nALL ${passed} CHECKS PASSED`);
