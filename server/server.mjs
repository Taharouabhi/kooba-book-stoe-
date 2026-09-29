// Kouba Book Store — self-hosted server.
// Serves the static storefront from web/ and the JSON API at
// /functions/v1/app by running functions/handler.mjs against PostgreSQL.
//
// Required environment variable:
//   DATABASE_URL   postgres://user:password@host:5432/database
// Optional:
//   PORT           default 8080
//   WEB_DIR        default: ../web (relative to this file)
//
// Run from the project root: npm install && npm start

import http from "node:http";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, posix, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { handleApp } from "../functions/handler.mjs";
import { connect } from "./pg-client.mjs";

const here = dirname(fileURLToPath(import.meta.url));
// Image uploads travel as base64 JSON; 8 MB leaves headroom above the
// handler's 5 MB binary cap.
const MAX_BODY = 8 * 1024 * 1024;
const IMAGE_FILE_RE = /\.(png|jpe?g|webp)$/i;
const FILE_SAFE_RE = /^[A-Za-z0-9._-]{1,120}$/;

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

async function serveApi(req, res, url, client, files) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) {
      res.writeHead(413, { "content-type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ error: "payload_too_large" }));
    }
    chunks.push(c);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  const headers = new Map();
  if (req.headers["x-kbs-admin"]) headers.set("x-kbs-admin", req.headers["x-kbs-admin"]);
  const request = {
    method: req.method,
    url: "http://internal" + url.pathname + url.search,
    headers,
    json: async () => { try { return JSON.parse(raw || "null"); } catch { return null; } },
  };
  const r = await handleApp({ request, supabase: client, files });
  res.writeHead(r.status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(await r.json()));
}

async function serveStatic(req, res, url, webDir) {
  let path = posix.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  if (path.endsWith("/")) path += "index.html";
  if (!extname(path)) path += ".html";
  const file = resolve(join(webDir, path));
  if (file !== webDir && !file.startsWith(webDir + sep)) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    return res.end("forbidden");
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": TYPES[extname(file).toLowerCase()] || "application/octet-stream",
      "x-content-type-options": "nosniff",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  }
}

export function createApp({ client, webDir }) {
  const root = resolve(webDir);
  const files = makeFiles(root);
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://internal");
      if (url.pathname === "/functions/v1/app") return await serveApi(req, res, url, client, files);
      return await serveStatic(req, res, url, root);
    } catch {
      res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "database_request_failed" }));
    }
  });
}

// Disk capability behind images.list / admin.upload. Uploaded covers are
// stored flat in web/assets/img next to the bundled design assets, so the
// storefront's assets/img/<name> URLs keep working.
function makeFiles(webDir) {
  const imgDir = join(webDir, "assets", "img");
  return {
    async listImages() {
      try {
        const names = await readdir(imgDir);
        return names.filter((n) => IMAGE_FILE_RE.test(n)).sort();
      } catch {
        return [];
      }
    },
    async saveImage(name, bytes) {
      if (!FILE_SAFE_RE.test(name)) throw new Error("unsafe image name");
      await writeFile(join(imgDir, name), bytes);
    },
  };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set.");
    console.error('Example: set DATABASE_URL=postgres://kbs:YOUR-PASSWORD@127.0.0.1:5432/kouba_books (Windows: $env:DATABASE_URL="...")');
    process.exit(1);
  }
  const { pool, client } = connect(databaseUrl);
  try {
    await pool.query("SELECT 1");
  } catch (e) {
    console.error("Could not connect to the database. Check DATABASE_URL and that PostgreSQL is running.");
    process.exit(1);
  }
  const port = Number(process.env.PORT) || 8080;
  const webDir = process.env.WEB_DIR || join(here, "..", "web");
  createApp({ client, webDir }).listen(port, () => {
    console.log(`Kouba Book Store running: http://localhost:${port}/ (admin: /admin/login.html)`);
  });
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
