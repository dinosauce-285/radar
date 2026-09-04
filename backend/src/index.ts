import fs from "node:fs";
import path from "node:path";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { env } from "./env.js";
import "./db/client.js"; // opens the DB and applies the schema
import { articlesRoute } from "./routes/articles.js";

const app = new Hono();

app.route("/api", articlesRoute);
app.get("/api/health", (c) =>
  c.json({ ok: true, model: env.GROQ_MODEL, hasApiKey: env.hasApiKey }),
);

// In prod we serve the frontend build from this same server, so the browser only
// ever sees one origin and CORS never enters the picture. In dev, Vite serves the
// UI instead and proxies /api back here.
const hasBuild = fs.existsSync(path.join(env.FRONTEND_DIST, "index.html"));
if (hasBuild) {
  app.use("/*", serveStatic({ root: path.relative(process.cwd(), env.FRONTEND_DIST) }));
  // SPA fallback: any path that doesn't match a real file returns index.html
  app.get("*", (c) =>
    c.html(fs.readFileSync(path.join(env.FRONTEND_DIST, "index.html"), "utf8")),
  );
}

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`radar  →  http://localhost:${info.port}`);
  if (!hasBuild) console.log("(no frontend/dist yet — run `pnpm dev` or `pnpm build`)");
  if (!env.hasApiKey) console.log("(no GROQ_API_KEY — ingest will skip the summarize step)");
});
