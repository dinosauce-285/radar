import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { db, sqlite } from "../db/client.js";

export const articlesRoute = new Hono();

type Row = Record<string, unknown> & { tags: string | null };

const shape = (r: Row) => ({
  ...r,
  tags: r.tags ? (JSON.parse(r.tags) as string[]) : [],
  saved: Boolean(r.saved),
  read: Boolean(r.read_at),
});

/**
 * GET /api/articles
 *   q         full-text search (FTS5)
 *   tag       filter by tag
 *   source    filter by source (Hacker News, r/programming, ...)
 *   minScore  minimum score
 *   filter    all | unread | saved
 *   sort      score | new
 */
articlesRoute.get("/articles", (c) => {
  const q = c.req.query("q")?.trim();
  const tag = c.req.query("tag");
  const source = c.req.query("source");
  const minScore = Number(c.req.query("minScore") ?? 0);
  const filter = c.req.query("filter") ?? "all";
  const sort = c.req.query("sort") ?? "score";
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const offset = Number(c.req.query("offset") ?? 0);

  const where: string[] = ["a.status = 'summarized'"];
  const params: unknown[] = [];

  if (tag) {
    // tags is stored as a JSON array, so json_each gives an exact match
    where.push(`EXISTS (SELECT 1 FROM json_each(a.tags) WHERE value = ?)`);
    params.push(tag);
  }
  if (source) {
    where.push("a.source_name = ?");
    params.push(source);
  }
  if (minScore > 0) {
    where.push("a.score >= ?");
    params.push(minScore);
  }
  if (filter === "unread") where.push("a.read_at IS NULL");
  if (filter === "saved") where.push("a.saved = 1");

  let from = "articles a";
  let orderBy =
    sort === "new"
      ? "a.published_at DESC"
      : "a.score DESC, a.published_at DESC";

  if (q) {
    // FTS5: hit the virtual table, then join back to articles on rowid
    from = `articles a JOIN articles_fts f ON f.rowid = a.id`;
    where.push("articles_fts MATCH ?");
    params.push(q);
    orderBy = "f.rank";
  }

  const rows = sqlite
    .prepare(
      `SELECT a.* FROM ${from}
       WHERE ${where.join(" AND ")}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as Row[];

  return c.json({ articles: rows.map(shape), limit, offset });
});

/** Sidebar counters: articles per tag and per source. */
articlesRoute.get("/stats", (c) => {
  const tags = sqlite
    .prepare(
      `SELECT value AS tag, COUNT(*) AS count
       FROM articles a, json_each(a.tags)
       WHERE a.status = 'summarized'
       GROUP BY value ORDER BY count DESC`,
    )
    .all();

  const sources = sqlite
    .prepare(
      `SELECT source_name AS source, COUNT(*) AS count
       FROM articles WHERE status = 'summarized'
       GROUP BY source_name ORDER BY count DESC`,
    )
    .all();

  const totals = sqlite
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) AS unread,
         SUM(saved) AS saved
       FROM articles WHERE status = 'summarized'`,
    )
    .get();

  return c.json({ tags, sources, totals });
});

articlesRoute.patch("/articles/:id/read", async (c) => {
  const id = Number(c.req.param("id"));
  const { read } = await c.req.json<{ read: boolean }>();
  db.run(
    sql`UPDATE articles SET read_at = ${read ? Math.floor(Date.now() / 1000) : null} WHERE id = ${id}`,
  );
  return c.json({ ok: true });
});

articlesRoute.patch("/articles/:id/save", async (c) => {
  const id = Number(c.req.param("id"));
  const { saved } = await c.req.json<{ saved: boolean }>();
  db.run(sql`UPDATE articles SET saved = ${saved ? 1 : 0} WHERE id = ${id}`);
  return c.json({ ok: true });
});
