import { REDDIT } from "../sources.js";
import { USER_AGENT, type RawItem } from "../types.js";

type RedditPost = {
  data: {
    title: string;
    url: string;
    permalink: string;
    ups: number;
    num_comments: number;
    created_utc: number;
    author: string;
    is_self: boolean;
    stickied: boolean;
  };
};

/**
 * Reddit via the public .json endpoints. No OAuth needed, but a distinctive
 * User-Agent is mandatory — omit it and Reddit answers 429 immediately.
 */
export async function fetchReddit(): Promise<RawItem[]> {
  if (!REDDIT.enabled) return [];

  const out: RawItem[] = [];

  for (const sub of REDDIT.subreddits) {
    const params = new URLSearchParams({
      limit: String(REDDIT.limitPerSub),
      t: REDDIT.timeframe,
    });
    const url = `https://www.reddit.com/r/${sub}/${REDDIT.sort}.json?${params}`;

    try {
      const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
      if (!res.ok) {
        console.warn(`  ! r/${sub}: HTTP ${res.status}`);
        continue;
      }
      const body = (await res.json()) as { data: { children: RedditPost[] } };

      for (const { data: p } of body.data.children) {
        // Skip stickied and self posts: no outbound link to read.
        if (p.stickied || p.is_self) continue;
        if (p.ups < REDDIT.minUpvotes) continue;

        out.push({
          url: p.url,
          title: p.title,
          source: "reddit",
          sourceName: `r/${sub}`,
          discussUrl: `https://www.reddit.com${p.permalink}`,
          author: p.author,
          points: p.ups,
          numComments: p.num_comments,
          publishedAt: Math.floor(p.created_utc),
        });
      }
    } catch (err) {
      console.warn(`  ! r/${sub}: ${(err as Error).message}`);
    }
  }

  return out;
}
