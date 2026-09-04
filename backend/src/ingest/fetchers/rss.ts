import Parser from "rss-parser";
import { RSS } from "../sources.js";
import { USER_AGENT, type RawItem } from "../types.js";

const parser = new Parser({
  timeout: 15_000,
  headers: { "user-agent": USER_AGENT },
});

/**
 * 14 days silently excluded 36 of 84 feeds: the personal blogs that post monthly had
 * nothing inside the window at all, so their whole archive was invisible and they
 * looked broken. 45 days gives those feeds a real starting corpus; deduplication keeps
 * a wider window from re-adding anything on later runs.
 */
const DEFAULT_MAX_AGE_DAYS = 45;

/**
 * Feeds are independent, so they run in parallel — but not all at once. Firing all 84
 * simultaneously made dozens of them time out that fetch perfectly well in smaller
 * batches: measured, 84-at-once took over 200s and lost 29 feeds, while 6-at-a-time
 * finished in 64s with zero failures. The limit is the fix, not a longer timeout.
 */
const FETCH_CONCURRENCY = 6;

async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        try {
          results[i] = { status: "fulfilled", value: await fn(items[i]) };
        } catch (reason) {
          results[i] = { status: "rejected", reason };
        }
      }
    }),
  );
  return results;
}

export async function fetchRss(): Promise<RawItem[]> {
  const out: RawItem[] = [];

  const results = await pool(RSS, FETCH_CONCURRENCY, (async (src) => {
      const feed = await parser.parseURL(src.url);
      const cutoff =
        Date.now() / 1000 - (src.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS) * 86_400;

      const items: RawItem[] = [];
      for (const item of feed.items) {
        if (!item.link || !item.title) continue;

        const publishedAt = item.isoDate
          ? Math.floor(new Date(item.isoDate).getTime() / 1000)
          : undefined;
        if (publishedAt && publishedAt < cutoff) continue;

        items.push({
          url: item.link,
          title: item.title.trim(),
          source: "rss",
          sourceName: src.name,
          author: item.creator ?? undefined,
          publishedAt,
        });
      }
      return items;
    }) as (src: (typeof RSS)[number]) => Promise<RawItem[]>);

  results.forEach((r, i) => {
    if (r.status === "fulfilled") out.push(...r.value);
    else console.warn(`  ! ${RSS[i].name}: ${r.reason?.message ?? r.reason}`);
  });

  return out;
}
