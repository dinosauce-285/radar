import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { articles } from "../db/schema.js";
import { env } from "../env.js";
import { fetchHackerNews } from "./fetchers/hn.js";
import { fetchReddit } from "./fetchers/reddit.js";
import { fetchRss } from "./fetchers/rss.js";
import { canonicalizeUrl, dedupeKey } from "./normalize.js";
import { extractArticle } from "./extract.js";
import { summarizeArticle } from "./summarize.js";
import type { RawItem } from "./types.js";

/** Run tasks in parallel, capped at `limit` in flight at once. */
async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      await fn(items[cursor++]);
    }
  });
  await Promise.all(workers);
}

async function collect(): Promise<RawItem[]> {
  const results = await Promise.allSettled([
    fetchHackerNews(),
    fetchReddit(),
    fetchRss(),
  ]);
  const labels = ["Hacker News", "Reddit", "RSS"];
  const out: RawItem[] = [];

  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      console.log(`  ${labels[i]}: ${r.value.length} items`);
      out.push(...r.value);
    } else {
      console.warn(`  ! ${labels[i]} failed: ${r.reason?.message ?? r.reason}`);
    }
  });
  return out;
}

function store(items: RawItem[]): number {
  const now = Math.floor(Date.now() / 1000);
  const seen = new Set<string>();
  let inserted = 0;

  for (const item of items) {
    const canonicalUrl = canonicalizeUrl(item.url);
    const key = dedupeKey(item.title, canonicalUrl);

    // Duplicate within this batch (same article on both HN and Reddit)
    if (seen.has(canonicalUrl) || seen.has(key)) continue;
    seen.add(canonicalUrl);
    seen.add(key);

    // Duplicate of something already stored
    const existing = db
      .select({ id: articles.id })
      .from(articles)
      .where(sql`${articles.canonicalUrl} = ${canonicalUrl} OR ${articles.dedupeKey} = ${key}`)
      .get();
    if (existing) continue;

    db.insert(articles)
      .values({
        url: item.url,
        canonicalUrl,
        dedupeKey: key,
        title: item.title,
        source: item.source,
        sourceName: item.sourceName,
        discussUrl: item.discussUrl ?? null,
        author: item.author ?? null,
        points: item.points ?? 0,
        numComments: item.numComments ?? 0,
        publishedAt: item.publishedAt ?? now,
        fetchedAt: now,
      })
      .run();
    inserted++;
  }

  return inserted;
}

async function enrich() {
  if (!env.hasApiKey) {
    console.log("\nSkipping summarize step: no GROQ_API_KEY in .env");
    return;
  }

  const pending = db
    .select()
    .from(articles)
    .where(eq(articles.status, "new"))
    .orderBy(sql`${articles.points} DESC, ${articles.publishedAt} DESC`)
    .limit(env.MAX_SUMMARIZE_PER_RUN)
    .all();

  if (pending.length === 0) {
    console.log("\nNothing left to summarize.");
    return;
  }

  console.log(
    `\nSummarizing ${pending.length} articles (model ${env.GROQ_MODEL}, ${env.SUMMARIZE_CONCURRENCY} at a time)...`,
  );

  let done = 0;
  let failed = 0;

  await pool(pending, env.SUMMARIZE_CONCURRENCY, async (row) => {
    try {
      const extracted = await extractArticle(row.url);
      const result = await summarizeArticle({
        title: row.title,
        sourceName: row.sourceName,
        url: row.url,
        content: extracted?.content ?? null,
      });

      db.update(articles)
        .set({
          content: extracted?.content ?? null,
          summary: result.summary,
          tags: JSON.stringify(result.tags),
          score: Math.round(result.score),
          status: "summarized",
          error: null,
        })
        .where(eq(articles.id, row.id))
        .run();

      done++;
      process.stdout.write(`\r  ${done + failed}/${pending.length}`);
    } catch (err) {
      failed++;
      db.update(articles)
        .set({ status: "failed", error: (err as Error).message.slice(0, 500) })
        .where(eq(articles.id, row.id))
        .run();
      process.stdout.write(`\r  ${done + failed}/${pending.length}`);
    }
  });

  console.log(`\n  Done: ${done} succeeded, ${failed} failed`);
}

async function main() {
  const started = Date.now();
  console.log(`[${new Date().toISOString()}] Starting ingest`);

  const items = await collect();
  const inserted = store(items);
  console.log(`\nCollected ${items.length} items, ${inserted} new after deduplication`);

  await enrich();

  const total = db.select({ n: sql<number>`count(*)` }).from(articles).get();
  console.log(
    `\nFinished in ${((Date.now() - started) / 1000).toFixed(1)}s. Total in DB: ${total?.n ?? 0} articles.`,
  );
}

main()
  .then(() => {
    // Fetching 80+ feeds in parallel leaves keep-alive sockets open, and Node will
    // not exit while any handle is still live — the run hung for minutes past the
    // last write. This is a one-shot batch job: once main() resolves the work is
    // committed, so exit rather than waiting on connections nobody is reading.
    process.exit(0);
  })
  .catch((err) => {
    console.error("Ingest failed:", err);
    process.exit(1);
  });
