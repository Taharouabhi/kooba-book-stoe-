// Local preview of the self-hosted store — the real server code from
// server/server.mjs running against the in-memory fake database, so no
// PostgreSQL is needed. Everything behaves like the VPS: cover uploads are
// saved into web/assets/img, orders and catalog edits live in memory and
// reset when the preview is stopped.
// Run: node dev/local-server.mjs [port]   (default: http://localhost:8080)

import { fileURLToPath } from "node:url";
import { createApp } from "../server/server.mjs";
import { newDb, makeClient } from "./fake-supabase.mjs";

const webDir = fileURLToPath(new URL("../web", import.meta.url));
const port = Number(process.argv[2]) || Number(process.env.PORT) || 8080;

createApp({ client: makeClient(newDb()), webDir }).listen(port, "127.0.0.1", () => {
  console.log(`Kouba Book Store preview: http://localhost:${port}/`);
  console.log(`Admin dashboard:          http://localhost:${port}/admin/login.html`);
  console.log("Orders and catalog edits are temporary (reset on stop); uploaded covers are kept in web/assets/img.");
  console.log("Stop the preview with Ctrl+C.");
});
