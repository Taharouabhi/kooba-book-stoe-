// Turns the raw live-backend downloads (db-dump/raw-catalog.json from
// catalog.list, db-dump/raw-orders.json from admin.orders) into clean
// database-row dumps that db/import-dump.mjs can load into any Postgres.
// Run from the project root: node dev/build-dump.mjs

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const dumpDir = join(dirname(fileURLToPath(import.meta.url)), "..", "db-dump");
const read = (name) => JSON.parse(readFileSync(join(dumpDir, name), "utf8"));
const write = (name, value) =>
  writeFileSync(join(dumpDir, name), JSON.stringify(value, null, 2) + "\n", "utf8");

const catalog = read("raw-catalog.json");
const orders = read("raw-orders.json");

// Catalog tables store rows as { id, data, sort }; the API returns rows in
// (sort, id) order, so position in the array is the sort value.
const rows = (list) => list.map((data, i) => ({ id: String(data.id), data, sort: i }));
write("books.json", rows(catalog.books || []));
write("categories.json", rows(catalog.categories || []));
write("bundles.json", rows(catalog.bundles || []));
write("settings.json", [{ id: "store", data: catalog.settings }]);

write("orders.json", (orders.orders || []).map((o) => ({
  id: o.id,
  ref: o.ref,
  customer_name: o.name,
  customer_phone: o.phone,
  wilaya: o.wilaya,
  city: o.city,
  address: o.address,
  note: o.note,
  items: o.items,
  subtotal: o.subtotal,
  shipping: o.shipping,
  total: o.total,
  delivery_method: o.delivery,
  payment_method: o.payment,
  status: o.status,
  created_at: o.createdAt,
})));

write("manifest.json", {
  exportedAt: new Date().toISOString(),
  source: "https://kouba-book-store-1smj44s7r3b.qoder.website (live Qoder backend)",
  tables: {
    books: (catalog.books || []).length,
    categories: (catalog.categories || []).length,
    bundles: (catalog.bundles || []).length,
    settings: 1,
    orders: (orders.orders || []).length,
  },
  notExported: {
    admin_sessions: "Login tokens only — you simply log in again after migration.",
    settings_admin_row: "Password-hash row; recreated automatically on first login with the same admin password as today.",
  },
  notes: [
    "Orders contain customer personal details — keep this folder private and delete it after a successful import.",
    "Book/category/bundle display order is preserved via the sort field.",
  ],
});

const files = readdirSync(dumpDir).filter((f) => !f.startsWith("raw-"));
console.log("dump written:", files.join(", "));
