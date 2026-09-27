// Local end-to-end test server: serves web/ and routes /functions/v1/app
// to the real handler with the in-memory fake Supabase (dev/ use only).
// Run: node dev/local-server.mjs [port]

import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { handleApp } from "../functions/handler.mjs";
import { newDb, makeClient } from "./fake-supabase.mjs";

const root = fileURLToPath(new URL("../web/", import.meta.url));
const port = Number(process.argv[2]) || 8777;
const db = newDb();
let seeded = false;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

async function serveApi(req, res, url) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  const headers = {};
  if (req.headers["x-kbs-admin"]) headers["x-kbs-admin"] = req.headers["x-kbs-admin"];
  const request = {
    method: req.method,
    url: "http://local" + url.pathname + url.search,
    headers: new Map(Object.entries(headers)),
    json: async () => { try { return JSON.parse(raw || "null"); } catch { return null; } },
  };
  const r = await handleApp({ request, supabase: makeClient(db) });
  if (!seeded) seeded = true; // catalog.list seeded the fake db on first call
  res.writeHead(r.status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(await r.json()));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://local");
  if (url.pathname === "/functions/v1/app") return serveApi(req, res, url);
  let path = posix.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  if (path.endsWith("/")) path += "index.html";
  if (!extname(path)) path += ".html";
  const file = join(root, path);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end("forbidden"); }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  }
});

server.listen(port, () => console.log(`local server: http://localhost:${port}/ (admin: /admin/login.html)`));
