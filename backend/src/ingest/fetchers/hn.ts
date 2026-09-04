import { HN } from "../sources.js";
import { USER_AGENT, type RawItem } from "../types.js";

type AlgoliaHit = {
  objectID: string;
  title: string | null;
  url: string | null;
  points: number | null;
  num_comments: number | null;
  created_at_i: number;
  author: string | null;
};

/**
 * Hacker News via the Algolia API — public, no key required, no aggressive rate
 * limiting. Docs: https://hn.algolia.com/api
 */
export async function fetchHackerNews(): Promise<RawItem[]> {
  if (!HN.enabled) return [];

  const since = Math.floor(Date.now() / 1000) - HN.windowHours * 3600;
  const params = new URLSearchParams({
    tags: "story",
    numericFilters: `points>=${HN.minPoints},created_at_i>${since}`,
    hitsPerPage: String(HN.limit),
  });

  const res = await fetch(`https://hn.algolia.com/api/v1/search?${params}`, {
    headers: { "user-agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`HN Algolia ${res.status} ${res.statusText}`);

  const body = (await res.json()) as { hits: AlgoliaHit[] };

  return body.hits
    // Skip Ask HN / Show HN posts with no outbound link: nothing to extract.
    .filter((h): h is AlgoliaHit & { url: string; title: string } =>
      Boolean(h.url && h.title))
    .map((h) => ({
      url: h.url,
      title: h.title,
      source: "hn" as const,
      sourceName: "Hacker News",
      discussUrl: `https://news.ycombinator.com/item?id=${h.objectID}`,
      author: h.author ?? undefined,
      points: h.points ?? 0,
      numComments: h.num_comments ?? 0,
      publishedAt: h.created_at_i,
    }));
}
