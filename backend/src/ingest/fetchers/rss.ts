import Parser from "rss-parser";
import { RSS } from "../sources.js";
import { USER_AGENT, type RawItem } from "../types.js";

const parser = new Parser({
  timeout: 15_000,
  headers: { "user-agent": USER_AGENT },
});

const DEFAULT_MAX_AGE_DAYS = 14;

export async function fetchRss(): Promise<RawItem[]> {
  const out: RawItem[] = [];

  // Run in parallel: feeds are independent, and one failing must not sink the rest.
  const results = await Promise.allSettled(
    RSS.map(async (src) => {
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
    }),
  );

  results.forEach((r, i) => {
    if (r.status === "fulfilled") out.push(...r.value);
    else console.warn(`  ! ${RSS[i].name}: ${r.reason?.message ?? r.reason}`);
  });

  return out;
}
