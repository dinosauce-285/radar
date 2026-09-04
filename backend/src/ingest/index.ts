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

/** Extraction can fail while summarization still succeeds, and then the model has scored
 *  an article it never read — one such article came back at 75, the top of the feed, on
 *  the strength of its title alone. Judge nothing "worth reading" sight unseen. */
const NO_CONTENT_SCORE_CAP = 49;
const cappedScore = (score: number, hasContent: boolean) =>
  Math.round(hasContent ? score : Math.min(score, NO_CONTENT_SCORE_CAP));

/**
 * Second pass: articles already summarized but with no article text, where extraction
 * has not been given up on yet. Fetching is cheap; re-summarizing is not, so only
 * articles that actually gain text are sent back to the model.
 */
async function backfillContent() {
  const thin = db
    .select()
    .from(articles)
    .where(
      sql`${articles.status} = 'summarized' AND ${articles.content} IS NULL
          AND ${articles.contentTries} < ${MAX_CONTENT_TRIES}`,
    )
    // Highest score first: an article scored 75 that nobody read is sitting at the top
    // of the feed misleading the reader, while one scored 12 is doing no harm at the
    // bottom. Fix the visible ones first — the batch is capped, so order decides who
    // waits for the next run.
    .orderBy(sql`${articles.score} DESC`)
    .limit(env.MAX_SUMMARIZE_PER_RUN)
    .all();
  if (thin.length === 0) return;

  console.log(`\nRetrying extraction for ${thin.length} articles summarized without text...`);
  let recovered = 0;

  await pool(thin, env.SUMMARIZE_CONCURRENCY, async (row) => {
    const extracted = await extractArticle(row.url);
    if (!extracted) {
      db.update(articles)
        .set({ contentTries: row.contentTries + 1 })
        .where(eq(articles.id, row.id))
        .run();
      return;
    }
    try {
      const result = await summarizeArticle({
        title: row.title,
        sourceName: row.sourceName,
        url: row.url,
        content: extracted.content,
      });
      db.update(articles)
        .set({
          content: extracted.content,
          summary: result.summary,
          tags: JSON.stringify(result.tags),
          score: Math.round(result.score),
          contentTries: row.contentTries + 1,
          error: null,
        })
        .where(eq(articles.id, row.id))
        .run();
      recovered++;
    } catch {
      // Leave the title-only summary in place; the next run can try again.
      db.update(articles)
        .set({ content: extracted.content, contentTries: row.contentTries + 1 })
        .where(eq(articles.id, row.id))
        .run();
    }
  });

  console.log(`  Recovered ${recovered} of ${thin.length}`);
}

/** Give up on extraction after this many attempts — some URLs are permanently 403,
 *  paywalled, or simply not HTML, and retrying them every run forever is waste. */
const MAX_CONTENT_TRIES = 3;

async function enrich() {
  if (!env.hasApiKey) {
    console.log("\nSkipping summarize step: no GROQ_API_KEY in .env");
    return;
  }

  const pending = db
    .select()
    .from(articles)
    // Retry failures too. A timeout, a 429, a model id that turned out to be wrong —
    // all transient, but selecting only 'new' meant one bad run dropped those articles
    // from the feed forever with no way back short of editing the database by hand.
    .where(sql`${articles.status} IN ('new', 'failed')`)
    // Newest first, deliberately NOT by points. Ordering by popularity would spend
    // the run's budget on whatever is highest on Hacker News — precisely the
    // announcement news the scoring rubric is built to send to the bottom — while
    // RSS articles, which carry no points at all, waited behind every one of them.
    .orderBy(sql`${articles.publishedAt} DESC`)
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
    let extracted: Awaited<ReturnType<typeof extractArticle>> = null;
    try {
      extracted = await extractArticle(row.url);
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
          score: cappedScore(result.score, extracted !== null),
          status: "summarized",
          contentTries: row.contentTries + 1,
          error: null,
        })
        .where(eq(articles.id, row.id))
        .run();

      done++;
      process.stdout.write(`\r  ${done + failed}/${pending.length}`);
    } catch (err) {
      failed++;
      db.update(articles)
        .set({
          // Keep whatever was already downloaded. Discarding it meant every retry after
          // a rate-limited summarize re-fetched the article from scratch.
          content: extracted?.content ?? row.content,
          contentTries: row.contentTries + 1,
          status: "failed",
          error: (err as Error).message.slice(0, 500),
        })
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
  await backfillContent();

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
