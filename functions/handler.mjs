// Kouba Book Store — application handler.
// Public actions: catalog.list, order.create, images.list.
// Admin actions: admin.login/logout/session, admin.orders, admin.order.setStatus,
// admin.stats, admin.books.save/delete, admin.categories.save/delete,
// admin.bundles.save/delete, admin.settings.save, admin.password.change,
// admin.upload.
// Responses use fixed error codes; provider details never reach the browser.
// Image actions use an optional "files" capability ({ listImages, saveImage });
// without it images.list reports null and admin.upload is unsupported, which is
// how the Qoder deployment (read-only function) behaves.

import { SEED } from "./seed.mjs";

const json = (body, status = 200, headers = {}) => Response.json(body, {
  status,
  headers: { "cache-control": "no-store", ...headers },
});

const ADMIN_EMAIL = "admin@koubabookstore.dz";
// SHA-256 of the initial admin password; the live value is the "admin" row in
// app.settings, written on first login so the dashboard can change it.
const BOOTSTRAP_HASH = "95f7abc0925a0cfe0e271222618e6ee44c38a9c59e80ba1eebf36cd52a9add23";
const SESSION_MS = 8 * 60 * 60 * 1000;
const STATUSES = ["new", "proc", "done", "cancel"];
const FREE_SHIPPING = 3000;
const FALLBACK_SHIPPING = { home: 800, office: 520 };
const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/i;
const FILE_RE = /^[A-Za-z0-9._-]{1,120}$/;
const HASH_RE = /^[0-9a-f]{64}$/;
const ICONS = new Set(["book", "landmark", "feather", "moon", "bulb", "atom", "smile", "grid"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DATAURL_CHARS = 8_000_000;
const IMAGE_MAGIC = [
  { ext: "png", test: (b) => b.length > 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: "jpg", test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "webp", test: (b) => b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
];

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bool = (v) => v === true;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function sha256hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  let out = "";
  for (const b of new Uint8Array(digest)) out += b.toString(16).padStart(2, "0");
  return out;
}

async function readBody(request) {
  try { return await request.json(); } catch { return null; }
}

/* ================= catalog ================= */

async function fetchTable(supabase, table) {
  const { data, error } = await supabase.from(table)
    .select("id,data,sort")
    .order("sort", { ascending: true })
    .order("id", { ascending: true });
  if (error || !Array.isArray(data)) throw new Error("database_request_failed");
  return data.map((row) => row.data);
}

async function fetchSettings(supabase, rowId) {
  const { data, error } = await supabase.from("settings")
    .select("id,data").eq("id", rowId).maybeSingle();
  if (error) throw new Error("database_request_failed");
  return data || null;
}

async function seedCatalog(supabase) {
  const rows = (list) => list.map((d, i) => ({ id: d.id, data: d, sort: i }));
  await Promise.all([
    supabase.from("categories").insert(rows(SEED.categories)),
    supabase.from("books").insert(rows(SEED.books)),
    supabase.from("bundles").insert(rows(SEED.bundles)),
    supabase.from("settings").insert({ id: "store", data: SEED.settings }),
  ]);
}

async function readCatalog(supabase) {
  let [books, categories, bundles] = await Promise.all([
    fetchTable(supabase, "books"),
    fetchTable(supabase, "categories"),
    fetchTable(supabase, "bundles"),
  ]);
  let settings = await fetchSettings(supabase, "store");
  if (!books.length && !categories.length && !bundles.length && !settings) {
    // First run: tolerate a concurrent seed losing the race on insert.
    await seedCatalog(supabase);
    [books, categories, bundles] = await Promise.all([
      fetchTable(supabase, "books"),
      fetchTable(supabase, "categories"),
      fetchTable(supabase, "bundles"),
    ]);
    settings = await fetchSettings(supabase, "store");
  }
  return { books, categories, bundles, settings: settings ? settings.data : SEED.settings };
}

/* ================= orders ================= */

async function createOrder(request, supabase) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
  const body = await readBody(request);
  if (!body || typeof body !== "object") return json({ error: "invalid_payload" }, 400);

  const name = str(body.name, 120);
  const phone = str(body.phone, 30);
  const wilaya = str(body.wilaya, 40);
  const city = str(body.city, 80);
  const address = str(body.address, 300);
  const note = str(body.note, 500);
  const delivery = body.delivery === "office" ? "office" : "home";
  const payment = body.payment === "ccp" ? "ccp" : "cod";
  if (name.length < 2) return json({ error: "invalid_name" }, 400);
  if (!/^[0-9+\s()-]{8,20}$/.test(phone)) return json({ error: "invalid_phone" }, 400);
  if (!wilaya) return json({ error: "invalid_wilaya" }, 400);
  if (address.length < 5) return json({ error: "invalid_address" }, 400);

  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  if (!rawItems.length) return json({ error: "invalid_items" }, 400);

  const { books, bundles, settings } = await readCatalog(supabase);
  const wilayaNames = new Set(
    Array.isArray(settings.allWilayas) && settings.allWilayas.length
      ? settings.allWilayas : SEED.settings.allWilayas
  );
  if (!wilayaNames.has(wilaya)) return json({ error: "invalid_wilaya" }, 400);

  const bookMap = new Map(books.map((b) => [String(b.id), b]));
  const bundleMap = new Map(bundles.map((b) => [String(b.id), b]));
  const items = [];
  for (const raw of rawItems) {
    const qty = raw && raw.qty;
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > 99) return json({ error: "invalid_items" }, 400);
    if (raw.type === "bundle") {
      const pk = bundleMap.get(String(raw.id || ""));
      if (!pk || !Number.isSafeInteger(pk.price)) return json({ error: "invalid_item" }, 400);
      items.push({ id: pk.id, type: "bundle", title: pk.name, price: pk.price, qty });
    } else {
      const b = bookMap.get(String(raw.id || ""));
      if (!b || !Number.isSafeInteger(b.price)) return json({ error: "invalid_item" }, 400);
      if (!Number.isSafeInteger(b.stock) || b.stock <= 0) return json({ error: "out_of_stock" }, 400);
      items.push({ id: b.id, type: "book", title: b.title, price: b.price, qty });
    }
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const rates = Array.isArray(settings.wilayas) && settings.wilayas.length
    ? settings.wilayas : SEED.settings.wilayas;
  const rate = rates.find((w) => w && w.name === wilaya);
  let shipping = rate && Number.isSafeInteger(rate[delivery]) && rate[delivery] >= 0
    ? rate[delivery] : FALLBACK_SHIPPING[delivery];
  if (subtotal >= FREE_SHIPPING) shipping = 0;
  const total = subtotal + shipping;

  const createdAt = new Date().toISOString();
  const order = {
    id: crypto.randomUUID(),
    ref: "KB-" + String(100000 + Math.floor(Math.random() * 900000)),
    customer_name: name,
    customer_phone: phone,
    wilaya,
    city,
    address,
    note,
    items: items.map((i) => ({ ...i, sub: i.price * i.qty })),
    subtotal,
    shipping,
    total,
    delivery_method: delivery,
    payment_method: payment,
    status: "new",
    created_at: createdAt,
  };
  const { error } = await supabase.from("orders").insert(order);
  if (error) return json({ error: "database_request_failed" }, 503);

  // Best-effort stock decrement; failures never fail the stored order.
  for (const i of items) {
    if (i.type !== "book") continue;
    const b = bookMap.get(i.id);
    if (!b || !Number.isSafeInteger(b.stock)) continue;
    await supabase.from("books")
      .update({ data: { ...b, stock: Math.max(0, b.stock - i.qty) } })
      .eq("id", i.id);
  }

  return json({
    order: {
      ref: order.ref, name, phone, wilaya, city, address, note,
      delivery, payment, items: order.items,
      subtotal, shipping, total, status: "new", createdAt,
    },
  }, 201);
}

async function adminOrders(request, supabase) {
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
  const { data, error } = await supabase.from("orders")
    .select("id,ref,customer_name,customer_phone,wilaya,city,address,note,items,subtotal,shipping,total,delivery_method,payment_method,status,created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(300);
  if (error || !Array.isArray(data)) return json({ error: "database_request_failed" }, 503);
  const orders = data.map((o) => ({
    id: o.id, ref: o.ref, name: o.customer_name, phone: o.customer_phone,
    wilaya: o.wilaya, city: o.city, address: o.address, note: o.note,
    items: Array.isArray(o.items) ? o.items : [],
    subtotal: o.subtotal, shipping: o.shipping, total: o.total,
    delivery: o.delivery_method, payment: o.payment_method,
    status: o.status, createdAt: o.created_at,
  }));
  return json({ orders });
}

async function setOrderStatus(request, supabase) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
  const body = await readBody(request);
  const id = str(body && body.id, 64);
  const status = str(body && body.status, 20);
  if (!TOKEN_RE.test(id)) return json({ error: "invalid_id" }, 400);
  if (!STATUSES.includes(status)) return json({ error: "invalid_status" }, 400);
  const { data, error } = await supabase.from("orders")
    .update({ status }).eq("id", id).select("id,status").maybeSingle();
  if (error) return json({ error: "database_request_failed" }, 503);
  if (!data) return json({ error: "not_found" }, 404);
  return json({ ok: true, status });
}

/* ================= admin auth ================= */

async function storedAdminHash(supabase) {
  const { data, error } = await supabase.from("settings")
    .select("id,data").eq("id", "admin").maybeSingle();
  if (!error && data && HASH_RE.test(String((data.data && data.data.hash) || ""))) {
    return { hash: data.data.hash, exists: true };
  }
  return { hash: BOOTSTRAP_HASH, exists: false };
}

async function adminLogin(request, supabase) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
  const body = await readBody(request);
  const email = str(body && body.email, 200).toLowerCase();
  const password = body && typeof body.password === "string" ? body.password : "";
  const fail = async () => { await delay(400); return json({ error: "invalid_credentials" }, 401); };
  if (email !== ADMIN_EMAIL || !password || password.length > 200) return await fail();

  const stored = await storedAdminHash(supabase);
  if (await sha256hex(password) !== stored.hash) return await fail();
  if (!stored.exists) {
    await supabase.from("settings").upsert({ id: "admin", data: { hash: BOOTSTRAP_HASH } });
  }

  const token = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_MS).toISOString();
  const { error } = await supabase.from("admin_sessions").insert({
    id: token,
    created_at: new Date(now).toISOString(),
    expires_at: expiresAt,
  });
  if (error) return json({ error: "database_request_failed" }, 503);
  return json({ token, expiresAt, email: ADMIN_EMAIL });
}

async function requireAdmin(request, supabase) {
  const token = (request.headers.get("x-kbs-admin") || "").trim();
  if (!TOKEN_RE.test(token)) return null;
  const { data, error } = await supabase.from("admin_sessions")
    .select("id,expires_at").eq("id", token).maybeSingle();
  if (error || !data) return null;
  const expiresAt = new Date(data.expires_at);
  if (isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    await supabase.from("admin_sessions").delete().eq("id", token);
    return null;
  }
  return { token, expiresAt: expiresAt.toISOString() };
}

async function adminSession(request, supabase) {
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
  const session = await requireAdmin(request, supabase);
  if (!session) return json({ error: "unauthorized" }, 401);
  return json({ email: ADMIN_EMAIL, expiresAt: session.expiresAt });
}

async function adminLogout(request, supabase) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
  const token = (request.headers.get("x-kbs-admin") || "").trim();
  if (TOKEN_RE.test(token)) await supabase.from("admin_sessions").delete().eq("id", token);
  return json({ ok: true });
}

async function changePassword(request, supabase) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
  const body = await readBody(request);
  const current = body && typeof body.current === "string" ? body.current : "";
  const next = body && typeof body.next === "string" ? body.next : "";
  const stored = await storedAdminHash(supabase);
  if (!current || await sha256hex(current) !== stored.hash) {
    await delay(400);
    return json({ error: "invalid_credentials" }, 401);
  }
  if (next.length < 10 || next.length > 200) return json({ error: "invalid_password" }, 400);
  const { error } = await supabase.from("settings")
    .upsert({ id: "admin", data: { hash: await sha256hex(next) } });
  if (error) return json({ error: "database_request_failed" }, 503);
  return json({ ok: true });
}

/* ================= stats ================= */

async function adminStats(request, supabase) {
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
  const { data: orderRows, error: ordersError } = await supabase.from("orders")
    .select("id,ref,customer_name,total,status,created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1000);
  if (ordersError || !Array.isArray(orderRows)) return json({ error: "database_request_failed" }, 503);
  const { data: bookRows, error: booksError } = await supabase.from("books").select("id,data");
  if (booksError || !Array.isArray(bookRows)) return json({ error: "database_request_failed" }, 503);
  const books = bookRows.map((r) => r.data);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthMs = monthStart.getTime();

  let salesMonth = 0;
  const counts = { all: orderRows.length, new: 0, proc: 0, done: 0, cancel: 0 };
  for (const o of orderRows) {
    if (counts[o.status] !== undefined) counts[o.status] += 1;
    if (o.status !== "cancel" && new Date(o.created_at).getTime() >= monthMs) salesMonth += o.total || 0;
  }

  const chart = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    chart.push({ date: d.toISOString().slice(0, 10), total: 0 });
  }
  for (const o of orderRows) {
    if (o.status === "cancel") continue;
    const key = String(o.created_at).slice(0, 10);
    const day = chart.find((c) => c.date === key);
    if (day) day.total += o.total || 0;
  }

  const lowStock = books
    .filter((b) => b && Number.isSafeInteger(b.stock) && b.stock <= 8)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5)
    .map((b) => ({ id: b.id, title: b.title, stock: b.stock, cover: b.cover }));
  const recent = orderRows.slice(0, 5).map((o) => ({
    ref: o.ref, name: o.customer_name, total: o.total, status: o.status, createdAt: o.created_at,
  }));

  return json({ salesMonth, counts, booksCount: books.length, lowStockCount: lowStock.length, lowStock, recent, chart });
}

/* ================= catalog writes ================= */

function cleanBook(input) {
  if (!input || typeof input !== "object") return null;
  const id = str(input.id, 40);
  if (!ID_RE.test(id)) return null;
  const title = str(input.title, 200);
  const author = str(input.author, 200);
  if (!title || !author) return null;
  if (!Number.isSafeInteger(input.price) || input.price < 0 || input.price > 10000000) return null;
  if (!Number.isSafeInteger(input.stock) || input.stock < 0 || input.stock > 1000000) return null;
  const cover = str(input.cover, 120);
  if (!FILE_RE.test(cover)) return null;
  const book = {
    id, title, author,
    cat: str(input.cat, 40) || "thaqafa",
    catLabel: str(input.catLabel, 80) || "كتب",
    price: input.price,
    stock: input.stock,
    cover,
    gallery: [],
    tags: [],
    rating: typeof input.rating === "number" && input.rating >= 0 && input.rating <= 5
      ? Math.round(input.rating * 10) / 10 : 4.5,
    reviews: Number.isSafeInteger(input.reviews) && input.reviews >= 0
      ? Math.min(input.reviews, 10000000) : 0,
    publisher: str(input.publisher, 120),
    pages: Number.isSafeInteger(input.pages) && input.pages >= 0 ? input.pages : str(input.pages, 20),
    lang: str(input.lang, 40) || "العربية",
    isNew: bool(input.isNew),
    desc: str(input.desc, 5000),
    desc2: str(input.desc2, 5000),
    featured: bool(input.featured),
    monthPick: bool(input.monthPick),
  };
  if (Array.isArray(input.gallery)) {
    book.gallery = input.gallery.slice(0, 6).map((g) => str(g, 120)).filter((g) => FILE_RE.test(g));
  }
  if (Array.isArray(input.tags)) {
    book.tags = input.tags.slice(0, 10).map((t) => str(t, 40)).filter(Boolean);
  }
  if (Number.isSafeInteger(input.old) && input.old >= 0 && input.old <= 10000000) book.old = input.old;
  return book;
}

function cleanCategory(input) {
  if (!input || typeof input !== "object") return null;
  const id = str(input.id, 40);
  if (!ID_RE.test(id)) return null;
  const name = str(input.name, 80);
  if (!name) return null;
  const icon = str(input.icon, 40);
  const image = str(input.image, 120);
  return {
    id, name,
    icon: ICONS.has(icon) ? icon : "book",
    image: FILE_RE.test(image) ? image : "cat-card-2.png",
    count: Number.isSafeInteger(input.count) && input.count >= 0 ? Math.min(input.count, 1000000) : 0,
    desc: str(input.desc, 300),
  };
}

function cleanBundle(input) {
  if (!input || typeof input !== "object") return null;
  const id = str(input.id, 40);
  if (!ID_RE.test(id)) return null;
  const name = str(input.name, 200);
  if (!name) return null;
  if (!Number.isSafeInteger(input.price) || input.price < 0 || input.price > 10000000) return null;
  const covers = Array.isArray(input.covers)
    ? input.covers.slice(0, 3).map((c) => str(c, 120)).filter((c) => FILE_RE.test(c)) : [];
  const bookIds = Array.isArray(input.bookIds)
    ? input.bookIds.slice(0, 20).map((b) => str(b, 40)).filter((b) => ID_RE.test(b)) : [];
  const bundle = {
    id, name,
    price: input.price,
    count: Number.isSafeInteger(input.count) && input.count >= 0 && input.count <= 1000
      ? input.count : bookIds.length,
    active: bool(input.active),
    covers,
    bookIds,
    save: Number.isSafeInteger(input.save) && input.save >= 0 && input.save <= 100 ? input.save : 0,
    desc: str(input.desc, 1000),
    featured: bool(input.featured),
  };
  if (Number.isSafeInteger(input.old) && input.old >= 0 && input.old <= 10000000) bundle.old = input.old;
  return bundle;
}

function cleanSettings(input) {
  if (!input || typeof input !== "object") return null;
  const wilayas = Array.isArray(input.wilayas)
    ? input.wilayas.slice(0, 58).map((w) => ({
        name: str(w && w.name, 40),
        home: w && Number.isSafeInteger(w.home) && w.home >= 0 ? w.home : 800,
        office: w && Number.isSafeInteger(w.office) && w.office >= 0 ? w.office : 520,
        capital: bool(w && w.capital),
      })).filter((w) => w.name)
    : SEED.settings.wilayas;
  const allWilayas = Array.isArray(input.allWilayas)
    ? input.allWilayas.slice(0, 58).map((w) => str(w, 40)).filter(Boolean)
    : SEED.settings.allWilayas;
  return {
    name: str(input.name, 80) || "Kouba Book Store",
    nameAr: str(input.nameAr, 80) || "مكتبة القبة",
    desc: str(input.desc, 300),
    phone: str(input.phone, 30),
    whatsapp: str(input.whatsapp, 30),
    email: str(input.email, 120),
    address: str(input.address, 200),
    adminEmail: str(input.adminEmail, 120) || ADMIN_EMAIL,
    shipRows: Array.isArray(input.shipRows)
      ? input.shipRows.slice(0, 58).map((r) => ({
          name: str(r && r.name, 40), eta: str(r && r.eta, 60),
        })).filter((r) => r.name)
      : [],
    wilayas,
    allWilayas,
  };
}

async function saveRow(supabase, table, row) {
  const { data: existing, error: readError } = await supabase.from(table)
    .select("id,sort").eq("id", row.id).maybeSingle();
  if (readError) return json({ error: "database_request_failed" }, 503);
  const sort = existing && Number.isSafeInteger(existing.sort) ? existing.sort : 9999;
  const { error } = await supabase.from(table).upsert({ id: row.id, data: row, sort });
  if (error) return json({ error: "database_request_failed" }, 503);
  return json({ item: row });
}

async function deleteRow(supabase, table, rawId) {
  const id = str(rawId, 40);
  if (!ID_RE.test(id)) return json({ error: "invalid_id" }, 400);
  const { data, error } = await supabase.from(table)
    .delete().eq("id", id).select("id").maybeSingle();
  if (error) return json({ error: "database_request_failed" }, 503);
  if (!data) return json({ error: "not_found" }, 404);
  return json({ ok: true });
}

/* ================= images =================
   Cover uploads only exist where the host can write the web folder
   (the self-hosted server). The handler validates content itself; the
   injected capability only persists bytes under a handler-chosen name. */

function decodeImageDataUrl(raw) {
  if (typeof raw !== "string" || raw.length > MAX_DATAURL_CHARS) return null;
  const m = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(raw);
  if (!m) return null;
  let bin;
  try { bin = atob(m[2].replace(/\s+/g, "")); } catch { return null; }
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function detectImageExt(bytes) {
  for (const { ext, test } of IMAGE_MAGIC) if (test(bytes)) return ext;
  return null;
}

async function listImages(request, files) {
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
  if (!files || typeof files.listImages !== "function") return json({ images: null });
  try {
    const images = await files.listImages();
    return json({ images: Array.isArray(images) ? images : [] });
  } catch {
    return json({ error: "database_request_failed" }, 503);
  }
}

async function uploadImage(body, files) {
  if (!files || typeof files.saveImage !== "function") {
    return json({ error: "unsupported" }, 400);
  }
  const bytes = decodeImageDataUrl(body && body.dataUrl);
  if (!bytes) return json({ error: "invalid_image" }, 400);
  if (bytes.length > MAX_IMAGE_BYTES) return json({ error: "image_too_large" }, 400);
  const ext = detectImageExt(bytes);
  if (!ext) return json({ error: "invalid_image" }, 400);
  const name = `up-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  try {
    await files.saveImage(name, bytes);
  } catch {
    return json({ error: "upload_failed" }, 503);
  }
  return json({ image: name }, 201);
}

/* ================= router ================= */

export async function handleApp({ request, supabase, files }) {
  const params = new URL(request.url).searchParams;
  const action = params.get("action") || "";
  try {
    if (action === "catalog.list") {
      if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
      const { books, categories, bundles, settings } = await readCatalog(supabase);
      return json({ books, categories, bundles, settings });
    }
    if (action === "images.list") return await listImages(request, files);
    if (action === "order.create") return await createOrder(request, supabase);
    if (action === "admin.login") return await adminLogin(request, supabase);
    if (action === "admin.logout") return await adminLogout(request, supabase);
    if (action === "admin.session") return await adminSession(request, supabase);

    if (action.startsWith("admin.")) {
      const session = await requireAdmin(request, supabase);
      if (!session) return json({ error: "unauthorized" }, 401);

      if (action === "admin.orders") return await adminOrders(request, supabase);
      if (action === "admin.stats") return await adminStats(request, supabase);
      if (action === "admin.order.setStatus") return await setOrderStatus(request, supabase);
      if (action === "admin.password.change") return await changePassword(request, supabase);

      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "GET, POST" });
      const body = await readBody(request);

      if (action === "admin.upload") return await uploadImage(body, files);

      if (action === "admin.books.save") {
        const book = cleanBook(body && (body.book || body));
        return book ? await saveRow(supabase, "books", book) : json({ error: "invalid_payload" }, 400);
      }
      if (action === "admin.books.delete") return await deleteRow(supabase, "books", body && body.id);

      if (action === "admin.categories.save") {
        const cat = cleanCategory(body && (body.category || body));
        return cat ? await saveRow(supabase, "categories", cat) : json({ error: "invalid_payload" }, 400);
      }
      if (action === "admin.categories.delete") return await deleteRow(supabase, "categories", body && body.id);

      if (action === "admin.bundles.save") {
        const bundle = cleanBundle(body && (body.bundle || body));
        return bundle ? await saveRow(supabase, "bundles", bundle) : json({ error: "invalid_payload" }, 400);
      }
      if (action === "admin.bundles.delete") return await deleteRow(supabase, "bundles", body && body.id);

      if (action === "admin.settings.save") {
        const settings = cleanSettings(body && (body.settings || body));
        if (!settings) return json({ error: "invalid_payload" }, 400);
        const { error } = await supabase.from("settings").upsert({ id: "store", data: settings });
        if (error) return json({ error: "database_request_failed" }, 503);
        return json({ settings });
      }
    }
    return json({ error: "not_found" }, 404);
  } catch {
    return json({ error: "database_request_failed" }, 503);
  }
}
