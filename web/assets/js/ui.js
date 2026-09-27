/* ============================================================
   مكتبة القبة — Shared runtime (ui.js)
   Provides: SVG sprite, helpers, header/footer injection,
   admin chrome, cart (localStorage), cart modal, and
   data-driven component renderers used across every page.
   ============================================================ */
(function () {
  "use strict";

  const D = window.DATA;

  /* ---------- Base path (admin pages live one level deeper) ---------- */
  const IS_ADMIN =
    document.body.dataset.admin === "1" ||
    /[\\/]admin[\\/]/.test(location.pathname);
  const BASE = IS_ADMIN ? ".." : "";
  const u = (p) => (p ? (BASE ? BASE + "/" + p : p) : p);

  /* ---------- SVG sprite ---------- */
  const PATHS = {
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h2.2l2.1 11.2a1.6 1.6 0 0 0 1.6 1.3h8.7a1.6 1.6 0 0 0 1.6-1.25L21 7H5.3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
    phone: '<path d="M6.5 3h3l1.5 4-2 1.3a12 12 0 0 0 5.7 5.7l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3Z"/>',
    whatsapp: '<path d="M4 20l1.3-4A8 8 0 1 1 8 19.4L4 20Z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a5 5 0 0 1-2.3-2.3l.8-1-1-2L9 8.5Z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6 8.5-6"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    "chevron-left": '<path d="m15 6-6 6 6 6"/>',
    "chevron-right": '<path d="m9 6 6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
    heart: '<path d="M12 20s-7-4.4-7-9.5A4 4 0 0 1 12 7a4 4 0 0 1 7 3.5C19 15.6 12 20 12 20Z"/>',
    star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8Z"/>',
    check: '<path d="m5 13 4 4L19 7"/>',
    "check-circle": '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.4 2.4 4.6-5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    book: '<path d="M5 4h9a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H5Z"/><path d="M17 7h2v13h-2"/>',
    landmark: '<path d="M4 10h16M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18M12 3 4 7h16Z"/>',
    feather: '<path d="M20 4c-6 0-11 4-12 10l-3 3"/><path d="M16 8H9v7"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.2.9 1.9h5.2c0-.7.3-1.4.9-1.9A6 6 0 0 0 12 3Z"/>',
    atom: '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="9" ry="4"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><circle cx="9" cy="10" r=".6" fill="currentColor"/><circle cx="15" cy="10" r=".6" fill="currentColor"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    alert: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17.5v.5"/>',
    "truck": '<path d="M2 6h11v9H2zM13 9h4l3 3v3h-7"/><circle cx="6" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
    box: '<path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
    tag: '<path d="M4 4h7l9 9-7 7-9-9V4Z"/><circle cx="8.5" cy="8.5" r="1.4"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
    dashboard: '<rect x="4" y="4" width="7" height="9" rx="1.5"/><rect x="13" y="4" width="7" height="5" rx="1.5"/><rect x="13" y="11" width="7" height="9" rx="1.5"/><rect x="4" y="15" width="7" height="5" rx="1.5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.5 5.5l2 2M16.5 16.5l2 2M18.5 5.5l-2 2M7.5 16.5l-2 2"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    logout: '<path d="M14 5H6v14h8"/><path d="M18 12H9M15 9l3 3-3 3"/>',
    edit: '<path d="M4 20h4L20 8l-4-4L4 16v4Z"/><path d="m14 6 4 4"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.6"/>',
    upload: '<path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    shield: '<path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-1.6 6"/><path d="M20 5v6h-6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    "arrow-right": '<path d="M4 12h16M14 6l6 6-6 6"/>',
    "arrow-left": '<path d="M20 12H4M10 6l-6 6 6 6"/>',
    "corner-down": '<path d="m6 9 6 6 6-6"/>',
    package: '<path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Z"/><path d="M3 7.5 12 12l9-4.5M12 12v9M7.5 5.2 16.5 9.8"/>',
    bell: '<path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z"/><path d="M10 18a2 2 0 0 0 4 0"/>',
  };

  function sprite() {
    const body = Object.keys(PATHS)
      .map((k) => `<symbol id="i-${k}" viewBox="0 0 24 24">${PATHS[k]}</symbol>`)
      .join("");
    return `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${body}</defs></svg>`;
  }

  function icon(name, cls) {
    return `<svg class="icon${cls ? " " + cls : ""}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  }

  /* ---------- Formatting helpers ---------- */
  const nf = new Intl.NumberFormat("en-US");
  function formatDZD(n) {
    return nf.format(Math.round(n)) + " د.ج";
  }
  function num(n) {
    return nf.format(n);
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function stars(rating) {
    let out = "";
    for (let i = 1; i <= 5; i++)
      out += icon("star", i <= Math.round(rating) ? "fill" : "");
    return out;
  }

  /* ============================================================
     CART (localStorage)
     ============================================================ */
  const KEY = "kbs_cart_v1";
  function readCart() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }
  function writeCart(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    refreshCartUI();
  }
  const Cart = {
    items: readCart(),
    save() { writeCart(this.items); },
    add(item, qty) {
      qty = qty || 1;
      const found = this.items.find((i) => i.id === item.id && i.type === item.type);
      if (found) found.qty += qty;
      else this.items.push({ id: item.id, title: item.title, price: item.price, cover: item.cover, type: item.type || "book", qty });
      this.save();
    },
    addBook(id, qty) {
      const b = D.books.find((x) => x.id === id);
      if (b) this.add({ id: b.id, title: b.title, price: b.price, cover: u(b.coverUrl), type: "book" }, qty);
    },
    addBundle(id, qty) {
      const b = D.bundles.find((x) => x.id === id);
      if (b) this.add({ id: b.id, title: b.name, price: b.price, cover: u(D.img(b.covers[0])), type: "bundle" }, qty);
    },
    remove(id, type) { this.items = this.items.filter((i) => !(i.id === id && i.type === type)); this.save(); },
    setQty(id, type, q) {
      const it = this.items.find((i) => i.id === id && i.type === type);
      if (!it) return;
      it.qty = Math.max(1, q);
      this.save();
    },
    clear() { this.items = []; this.save(); },
    count() { return this.items.reduce((s, i) => s + i.qty, 0); },
    subtotal() { return this.items.reduce((s, i) => s + i.qty * i.price, 0); },
  };

  function refreshCartUI() {
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      const c = Cart.count();
      el.textContent = c;
      el.classList.toggle("hidden", c === 0);
    });
    document.querySelectorAll("[data-cart-total]").forEach((el) => {
      el.textContent = formatDZD(Cart.subtotal());
    });
    if (document.querySelector(".overlay.open#cartModal")) renderCartModal();
    if (typeof window.__onCartChange === "function") window.__onCartChange(Cart);
  }

  /* ============================================================
     PUBLIC HEADER + FOOTER
     ============================================================ */
  function navLinks(active) {
    const links = [
      { href: "index.html", label: "الرئيسية", key: "home" },
      { href: "category.html", label: "التصنيفات", key: "categories" },
      { href: "bundles.html", label: "باقات الكتب", key: "bundles" },
      { href: "new-releases.html", label: "وصل حديثاً", key: "new" },
      { href: "shipping.html", label: "التوصيل والأسعار", key: "shipping" },
    ];
    return links.map((l) =>
      `<a href="${u(l.href)}"${l.key === active ? ' class="active"' : ""}>${l.label}</a>`
    ).join("");
  }

  function headerHTML(active) {
    const s = D.settings;
    return `
    <div class="topbar">
      <div class="container">
        <span>${icon("smile")} مرحباً بك في ${esc(s.nameAr)}</span>
        <span class="tb-mid">${icon("truck")} توصيل سريع لكل الولايات</span>
        <span class="latin">${icon("phone")} <b class="num" dir="ltr">+213 555 12 34 56</b></span>
      </div>
    </div>
    <header class="site-header">
      <div class="container header-inner">
        <button class="menu-toggle" data-drawer-open aria-label="القائمة">${icon("menu")}</button>
        <a class="brand" href="${u("index.html")}">
          <img src="${u("assets/img/logo.png")}" alt="${esc(s.nameAr)}">
          <span class="brand-name">${esc(s.nameAr)}</span>
        </a>
        <nav class="main-nav" aria-label="التنقل الرئيسي">${navLinks(active)}</nav>
        <form class="header-search" role="search" data-search-form>
          <div class="search-pill">
            ${icon("search")}
            <input type="search" name="q" placeholder="ابحث عن منتج..." aria-label="بحث">
          </div>
        </form>
        <div class="header-cart">
          <span class="cart-total num" data-cart-total>0 د.ج</span>
          <a class="cart-btn" href="${u("cart.html")}" aria-label="سلة المشتريات">
            ${icon("cart")}
            <span class="cart-badge num" data-cart-count>0</span>
          </a>
        </div>
      </div>
    </header>
    <div class="drawer" data-drawer>
      <div class="drawer-backdrop" data-drawer-close></div>
      <div class="drawer-panel" role="dialog" aria-label="القائمة">
        <div class="drawer-head">
          <span class="brand-name">${esc(s.nameAr)}</span>
          <button class="close-x" data-drawer-close aria-label="إغلاق">${icon("x")}</button>
        </div>
        ${navLinks(active)}
      </div>
    </div>`;
  }

  function footerHTML() {
    const s = D.settings;
    return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="footer-logo">${esc(s.nameAr)}</div>
            <p>${esc(s.desc)}</p>
            <div class="footer-help">
              <a href="#" aria-label="واتساب">${icon("whatsapp")}</a>
              <a href="#" aria-label="بريد">${icon("mail")}</a>
              <a href="#" aria-label="هاتف">${icon("phone")}</a>
            </div>
          </div>
          <div class="footer-col">
            <h4>روابط سريعة</h4>
            <a href="${u("index.html")}">الرئيسية</a>
            <a href="${u("category.html")}">التصنيفات</a>
            <a href="${u("bundles.html")}">باقات الكتب</a>
            <a href="${u("new-releases.html")}">وصل حديثاً</a>
          </div>
          <div class="footer-col">
            <h4>خدمة العملاء</h4>
            <a href="${u("shipping.html")}">التوصيل والأسعار</a>
            <a href="${u("cart.html")}">سلة المشتريات</a>
            <a href="${u("shipping.html")}">طرق الدفع</a>
            <a href="${u("shipping.html")}">سياسة الإرجاع</a>
          </div>
          <div class="footer-col">
            <h4>تواصل معنا</h4>
            <a href="#" class="latin" dir="ltr">+213 555 12 34 56</a>
            <a href="#">${esc(s.email)}</a>
            <a href="#">${esc(s.address)}</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">© ${new Date().getFullYear()} ${esc(s.nameAr)} — جميع الحقوق محفوظة.</div>
    </footer>`;
  }

  /* ============================================================
     ADMIN CHROME (sidebar + topbar)
     ============================================================ */
  function adminNav(active) {
    const links = [
      { href: "index.html", label: "نظرة عامة", key: "overview", icon: "dashboard" },
      { href: "books.html", label: "إدارة الكتب", key: "books", icon: "book" },
      { href: "categories.html", label: "إدارة التصنيفات", key: "categories", icon: "grid" },
      { href: "orders.html", label: "إدارة الطلبات", key: "orders", icon: "cart" },
      { href: "bundles.html", label: "إدارة الباقات", key: "bundles", icon: "layers" },
      { href: "settings.html", label: "الإعدادات", key: "settings", icon: "settings" },
    ];
    return links.map((l) =>
      `<a href="${l.href}"${l.key === active ? ' class="active"' : ""}>${icon(l.icon)}<span>${l.label}</span></a>`
    ).join("");
  }

  function adminSidebar(active) {
    const s = D.settings;
    return `
    <aside class="dash-side" data-dash-side>
      <div class="dash-brand">
        <span class="logo-ic">${icon("book")}</span>
        <div>
          <h1>${esc(s.name)}</h1>
          <span>لوحة التحكم</span>
        </div>
      </div>
      <nav class="dash-nav">${adminNav(active)}</nav>
      <a class="dash-logout" href="login.html">${icon("logout")}<span>تسجيل الخروج</span></a>
    </aside>`;
  }

  function adminTop(title) {
    return `
    <div class="dash-top">
      <div class="flex items-center gap-1">
        <button class="dash-hamb" data-dash-toggle aria-label="القائمة">${icon("menu")}</button>
        <h2>${esc(title)}</h2>
      </div>
      <div class="dash-user">
        <div class="who">
          <b>المدير العام</b>
          <span>${esc(D.settings.adminEmail)}</span>
        </div>
        <span class="ava"><img src="../assets/img/admin-avatar.png" alt="المشرف"></span>
      </div>
    </div>`;
  }

  /* ============================================================
     COMPONENT RENDERERS
     ============================================================ */
  function categoryChip(cat, active) {
    return `<a class="chip${active ? " active" : ""}" href="category.html?c=${cat.id}">
      ${icon(cat.icon)}<span>${esc(cat.name)}</span>
    </a>`;
  }

  function productCard(b) {
    const off = b.old ? Math.round((1 - b.price / b.old) * 100) : 0;
    return `<article class="pcard">
      <div class="pcard-media">
        ${b.isNew ? `<span class="badge badge-new start">جديد</span>` : ""}
        ${off ? `<span class="badge badge-off end">خصم ${off}%</span>` : ""}
        <a href="book.html?id=${b.id}"><img src="${u(b.coverUrl)}" alt="${esc(b.title)}" loading="lazy"></a>
      </div>
      <div class="pcard-body">
        <div class="pcard-cat">${esc(b.catLabel)}</div>
        <h3 class="pcard-title"><a href="book.html?id=${b.id}">${esc(b.title)}</a></h3>
        <div class="pcard-author">${esc(b.author)}</div>
        <div class="pcard-foot">
          <div>
            <span class="price">${formatDZD(b.price)}</span>
            ${b.old ? `<span class="price-old">${formatDZD(b.old)}</span>` : ""}
          </div>
          <button class="add-round" data-add-to-cart="${b.id}" aria-label="أضف ${esc(b.title)} إلى السلة">${icon("plus")}</button>
        </div>
      </div>
    </article>`;
  }

  function homeCard(b) {
    return `<article class="hcard">
      <a class="hcard-media" href="book.html?id=${b.id}"><img src="${u(b.coverUrl)}" alt="${esc(b.title)}" loading="lazy"></a>
      <div class="hcard-body">
        <h3 class="hcard-title"><a href="book.html?id=${b.id}">${esc(b.title)}</a></h3>
        <div class="hcard-author">${esc(b.author)}</div>
        <div class="hcard-price num">${num(b.price)} دج</div>
      </div>
      <button class="btn btn-outline btn-block" data-add-to-cart="${b.id}">أطلب</button>
    </article>`;
  }

  function bundleCard(pk) {
    const covers = pk.covers.slice(0, 3).map((c) => `<img src="${u(D.img(c))}" alt="" loading="lazy">`).join("");
    return `<article class="bcard">
      <span class="bcard-badge">وفّر ${pk.save}%</span>
      <a href="bundle.html?id=${pk.id}"><div class="bcard-stack">${covers}</div></a>
      <h3 class="bcard-title"><a href="bundle.html?id=${pk.id}">${esc(pk.name)}</a></h3>
      <div class="bcard-count">${pk.count} كتب</div>
      <div class="bcard-price">
        <span class="new num">${num(pk.price)} دج</span>
        <span class="old num">${num(pk.old)} دج</span>
      </div>
      <button class="btn btn-outline btn-block" data-add-bundle="${pk.id}">أطلب</button>
    </article>`;
  }

  function catCard(cat) {
    return `<article class="cat-card" data-cat-id="${cat.id}">
      <div class="top"></div>
      <a class="cimg" href="category.html?c=${cat.id}"><img src="${u(cat.image)}" alt="${esc(cat.name)}" loading="lazy"></a>
      <div class="cacts">
        <button class="ra" title="تعديل">${icon("edit")}</button>
        <button class="ra danger" title="حذف">${icon("trash")}</button>
      </div>
      <div class="cbody">
        <h3>${esc(cat.name)}</h3>
        <span class="cnt num">${icon("book")} ${cat.count}</span>
      </div>
    </article>`;
  }

  /* ============================================================
     CART MODAL
     ============================================================ */
  function cartModalHTML() {
    return `<div class="overlay" id="cartModal" role="dialog" aria-modal="true" aria-label="سلة المشتريات">
      <div class="modal">
        <div class="modal-head">
          <h3>سلة المشتريات</h3>
          <button class="close-x" data-cart-close aria-label="إغلاق">${icon("x")}</button>
        </div>
        <div class="modal-body" data-cart-modal-body></div>
        <div class="modal-foot">
          <div class="sum-row total" style="border:none;margin:0;padding:0 0 6px">
            <span>المجموع</span><span class="v num" data-cart-modal-total>0 د.ج</span>
          </div>
          <a class="btn btn-cta btn-block" href="${u("checkout.html")}" data-cart-close>إتمام الطلب</a>
          <a class="btn btn-ghost btn-block" href="${u("cart.html")}" data-cart-close>عرض السلة</a>
        </div>
      </div>
    </div>`;
  }

  function renderCartModal() {
    const body = document.querySelector("[data-cart-modal-body]");
    const total = document.querySelector("[data-cart-modal-total]");
    if (!body) return;
    if (!Cart.items.length) {
      body.innerHTML = `<div class="center" style="padding:26px 0">
        <img src="${u("assets/img/empty-cart.png")}" alt="" style="width:140px;margin:0 auto 14px">
        <p class="muted">سلتك فارغة حالياً.</p></div>`;
      if (total) total.textContent = formatDZD(0);
      return;
    }
    body.innerHTML = Cart.items.map((i) => `
      <div class="mini-item">
        <span class="thumb"><img src="${i.cover}" alt=""></span>
        <div class="ci-info">
          <div class="ci-title" style="font-size:16px">${esc(i.title)}</div>
          <div class="ci-meta">${i.qty} × ${formatDZD(i.price)}</div>
        </div>
        <button class="icon-btn" data-remove="${i.id}" data-type="${i.type}" aria-label="حذف">${icon("trash")}</button>
      </div>`).join("");
    if (total) total.textContent = formatDZD(Cart.subtotal());
  }

  function openCartModal() {
    let m = document.getElementById("cartModal");
    if (!m) { document.body.insertAdjacentHTML("beforeend", cartModalHTML()); m = document.getElementById("cartModal"); }
    renderCartModal();
    m.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeCartModal() {
    const m = document.getElementById("cartModal");
    if (m) m.classList.remove("open");
    document.body.style.overflow = "";
  }

  /* ============================================================
     TOAST
     ============================================================ */
  function toast(msg) {
    let t = document.getElementById("kbsToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "kbsToast";
      t.style.cssText = "position:fixed;bottom:24px;inset-inline-start:50%;transform:translateX(50%);background:#00401d;color:#fff;font-family:var(--f-ui);padding:13px 22px;border-radius:9999px;z-index:200;box-shadow:0 10px 30px rgba(0,0,0,.25);opacity:0;transition:.25s;font-size:15px;display:flex;gap:9px;align-items:center";
      document.body.appendChild(t);
    }
    t.innerHTML = icon("check-circle") + "<span>" + esc(msg) + "</span>";
    requestAnimationFrame(() => { t.style.opacity = "1"; });
    clearTimeout(t._h);
    t._h = setTimeout(() => { t.style.opacity = "0"; }, 2200);
  }

  /* ============================================================
     EVENT DELEGATION
     ============================================================ */
  function bind() {
    document.addEventListener("click", (e) => {
      const addBtn = e.target.closest("[data-add-to-cart]");
      if (addBtn) {
        e.preventDefault();
        const qty = parseInt(document.querySelector("[data-qty-val]")?.textContent || "1", 10);
        Cart.addBook(addBtn.dataset.addToCart, isNaN(qty) ? 1 : qty);
        toast("تمت الإضافة إلى السلة");
        openCartModal();
        return;
      }
      const addBundle = e.target.closest("[data-add-bundle]");
      if (addBundle) {
        e.preventDefault();
        Cart.addBundle(addBundle.dataset.addBundle, 1);
        toast("تمت إضافة الباقة إلى السلة");
        openCartModal();
        return;
      }
      const rm = e.target.closest("[data-remove]");
      if (rm) { Cart.remove(rm.dataset.remove, rm.dataset.type || "book"); return; }

      const open = e.target.closest("[data-cart-open]");
      if (open) { e.preventDefault(); openCartModal(); return; }
      const close = e.target.closest("[data-cart-close], #cartModal .overlay, #cartModal");
      if (e.target.id === "cartModal" || e.target.closest("[data-cart-close]")) { closeCartModal(); return; }

      const dOpen = e.target.closest("[data-drawer-open]");
      if (dOpen) { document.querySelector("[data-drawer]")?.classList.add("open"); return; }
      const dClose = e.target.closest("[data-drawer-close]");
      if (dClose) { document.querySelector("[data-drawer]")?.classList.remove("open"); return; }

      const dToggle = e.target.closest("[data-dash-toggle]");
      if (dToggle) { document.querySelector("[data-dash-side]")?.classList.toggle("open"); return; }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeCartModal(); document.querySelector("[data-drawer]")?.classList.remove("open"); }
    });

    // Header search → results page
    document.addEventListener("submit", (e) => {
      const f = e.target.closest("[data-search-form]");
      if (f) {
        e.preventDefault();
        const q = f.querySelector("input[name=q]").value.trim();
        location.href = u("search.html") + "?q=" + encodeURIComponent(q);
      }
    });
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function boot() {
    document.body.insertAdjacentHTML("afterbegin", sprite());

    const h = document.getElementById("site-header");
    if (h) {
      h.innerHTML = headerHTML(document.body.dataset.page || "");
      const f = document.getElementById("site-footer");
      if (f) f.innerHTML = footerHTML();
    }

    const side = document.getElementById("dash-side");
    if (side) side.innerHTML = adminSidebar(document.body.dataset.page || "");
    const top = document.getElementById("dash-top");
    if (top) top.innerHTML = adminTop(document.body.dataset.title || "");

    refreshCartUI();
    bind();

    // Expose API for pages
    window.KBS = {
      D, u, icon, esc, formatDZD, num, stars, Cart,
      renderers: { productCard, homeCard, bundleCard, categoryChip, catCard },
      openCartModal, closeCartModal, renderCartModal, toast, IS_ADMIN,
    };
  }

  // ui.js is loaded at the end of <body>, so the DOM (and the header/footer
  // placeholders) already exist — boot synchronously so page scripts that
  // follow can rely on window.KBS immediately.
  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
