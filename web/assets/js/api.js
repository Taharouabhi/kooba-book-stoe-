/* ============================================================
   مكتبة القبة — API client (api.js)
   Same-origin calls to the site Function (/functions/v1/app).
   Public pages silently fall back to the bundled data when the
   API is unreachable; admin pages require a session token.
   ============================================================ */
(function () {
  "use strict";
  const D = window.DATA;
  const ENDPOINT = "/functions/v1/app";
  const TOKEN_KEY = "kbs_admin_token_v1";

  /* ---------- user-facing messages (never raw provider errors) ---------- */
  const MESSAGES = {
    network_error: "تعذّر الاتصال بالخدمة، تحقق من اتصالك بالإنترنت ثم حاول مجدداً.",
    invalid_response: "حدث خطأ غير متوقع، حاول مرة أخرى.",
    invalid_credentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    unauthorized: "انتهت الجلسة، الرجاء تسجيل الدخول من جديد.",
    invalid_name: "الرجاء كتابة الاسم الكامل.",
    invalid_phone: "رقم الهاتف غير صحيح.",
    invalid_wilaya: "الرجاء اختيار الولاية.",
    invalid_address: "الرجاء كتابة العنوان بالتفصيل.",
    invalid_items: "سلة المشتريات فارغة أو تحتوي عناصر غير صحيحة.",
    invalid_item: "أحد المنتجات في سلتك لم يعد متوفراً، حدّث السلة وحاول مجدداً.",
    out_of_stock: "أحد الكتب في سلتك نفدت كميته حالياً، حدّث السلة وحاول مجدداً.",
    database_request_failed: "تعذّر تنفيذ العملية، حاول مجدداً بعد لحظات.",
    unsupported: "رفع الصور متاح فقط على النسخة المستضافة على خادمك الخاص.",
    invalid_image: "الملف ليس صورة مدعومة. الصيغ المقبولة: PNG أو JPG أو WebP.",
    image_too_large: "حجم الصورة أكبر من 5 ميجابايت، صغّر الصورة وحاول مجدداً.",
    upload_failed: "تعذّر حفظ الصورة على الخادم، حاول مرة أخرى.",
  };
  const msg = (code) => MESSAGES[code] || "حدث خطأ غير متوقع، حاول مرة أخرى.";

  /* ---------- low-level request (never throws) ---------- */
  async function request(action, opts) {
    opts = opts || {};
    const headers = { accept: "application/json" };
    if (opts.body !== undefined) headers["content-type"] = "application/json";
    if (opts.admin) {
      const t = getAdminToken();
      if (t) headers["x-kbs-admin"] = t;
    }
    let res;
    try {
      res = await fetch(ENDPOINT + "?action=" + encodeURIComponent(action), {
        method: opts.method || (opts.body !== undefined ? "POST" : "GET"),
        headers,
        credentials: "same-origin",
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
    } catch (e) {
      return { ok: false, status: 0, error: "network_error", data: null };
    }
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok || !data || typeof data !== "object") {
      return {
        ok: false,
        status: res.status,
        error: (data && data.error) || "invalid_response",
        data: null,
      };
    }
    return { ok: true, status: res.status, data };
  }

  /* ---------- admin session ---------- */
  function getAdminToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }
  function setAdminToken(t) {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* storage unavailable */ }
  }
  async function adminRequest(action, body) {
    if (!getAdminToken()) return { ok: false, status: 401, error: "unauthorized", data: null };
    const r = await request(action, { method: body !== undefined ? "POST" : "GET", body, admin: true });
    if (r.status === 401) setAdminToken("");
    return r;
  }
  async function requireAdminSession() {
    if (!getAdminToken()) { location.replace("login.html"); return false; }
    const r = await request("admin.session", { admin: true });
    if (!r.ok) {
      setAdminToken("");
      location.replace("login.html");
      return false;
    }
    return true;
  }
  async function logoutAdmin() {
    if (getAdminToken()) {
      try { await request("admin.logout", { method: "POST", body: {}, admin: true }); } catch (e) { /* best effort */ }
    }
    setAdminToken("");
  }

  /* ---------- live catalog ---------- */
  function applyCatalog(data) {
    if (!data || typeof data !== "object") return false;
    if (Array.isArray(data.books)) {
      const books = data.books.filter((b) => b && b.id && typeof b.cover === "string");
      books.forEach((b) => { b.coverUrl = D.img(b.cover); });
      if (books.length) D.books.splice(0, D.books.length, ...books);
    }
    if (Array.isArray(data.categories)) {
      const cats = data.categories.filter(Boolean);
      if (cats.length) D.categories.splice(0, D.categories.length, ...cats);
    }
    if (Array.isArray(data.bundles)) {
      const pks = data.bundles.filter(Boolean);
      if (pks.length) D.bundles.splice(0, D.bundles.length, ...pks);
    }
    const s = data.settings;
    if (s && typeof s === "object") {
      if (Array.isArray(s.wilayas) && s.wilayas.length) {
        D.wilayas.splice(0, D.wilayas.length, ...s.wilayas.filter((w) => w && w.name));
      }
      if (Array.isArray(s.allWilayas) && s.allWilayas.length) {
        D.allWilayas.splice(0, D.allWilayas.length, ...s.allWilayas);
      }
      const copy = {};
      ["name", "nameAr", "desc", "phone", "whatsapp", "email", "address", "adminEmail"]
        .forEach((k) => { if (typeof s[k] === "string" && s[k]) copy[k] = s[k]; });
      if (Array.isArray(s.shipRows)) copy.shipRows = s.shipRows;
      Object.assign(D.settings, copy);
    }
    return true;
  }

  let catalogPromise = null;
  function refreshCatalog(rerender) {
    if (!catalogPromise) {
      catalogPromise = request("catalog.list")
        .then((r) => (r.ok ? applyCatalog(r.data) : false))
        .catch(() => false);
    }
    if (typeof rerender === "function") {
      catalogPromise.then((changed) => {
        if (!changed) return;
        try { rerender(); } catch (e) { /* keep bundled view */ }
      });
    }
    return catalogPromise;
  }

  /* ---------- cover images ---------- */
  function listImages() {
    return request("images.list");
  }
  function uploadImage(dataUrl) {
    return adminRequest("admin.upload", { dataUrl });
  }

  /* ---------- checkout ---------- */
  function createOrder(payload) {
    return request("order.create", { method: "POST", body: payload });
  }
  // A 0-status or 5xx response means the outcome is unknown: the order may
  // or may not have been stored. Never replay such a submit automatically.
  function isOutcomeUnknown(r) {
    return !r.ok && (r.status === 0 || r.status >= 500 || r.error === "invalid_response");
  }

  /* ---------- dashboard logout link ---------- */
  document.addEventListener("click", (e) => {
    const lo = e.target.closest(".dash-logout");
    if (!lo) return;
    e.preventDefault();
    logoutAdmin().then(() => {
      try { sessionStorage.removeItem("kbs_admin"); } catch (err) { /* ignore */ }
      location.href = lo.getAttribute("href") || "login.html";
    });
  });

  window.KBS_API = {
    request,
    adminRequest,
    refreshCatalog,
    applyCatalog,
    createOrder,
    isOutcomeUnknown,
    msg,
    listImages,
    uploadImage,
    getAdminToken,
    setAdminToken,
    requireAdminSession,
    logoutAdmin,
  };
})();
