/**
 * ==========================================================================
 *  SOURCE LIST — edit this file to change what you read.
 *  These are generic defaults. Add or remove entries freely; nothing else in
 *  the codebase depends on the specific values.
 * ==========================================================================
 */

export type RssSource = {
  name: string;
  url: string;
  /** Skip items older than this many days. Defaults to 14. */
  maxAgeDays?: number;
};

/** Hacker News, queried through the Algolia API. */
export const HN = {
  enabled: true,
  /** Only take stories above this score. Raise it if the feed is too noisy. */
  minPoints: 100,
  /** How many hours back to look. */
  windowHours: 48,
  limit: 60,
};

/** Subreddits, read through the public .json endpoints. No API key needed. */
export const REDDIT = {
  enabled: true,
  subreddits: ["programming", "webdev"],
  /** 'hot' | 'top' | 'new' */
  sort: "top" as const,
  /** Only applies when sort is 'top': hour | day | week | month */
  timeframe: "day" as const,
  minUpvotes: 200,
  limitPerSub: 25,
};

/** RSS / Atom feed. */
export const RSS: RssSource[] = [
  { name: "Lobsters", url: "https://lobste.rs/rss" },
  { name: "Cloudflare Blog", url: "https://blog.cloudflare.com/rss/" },
  { name: "GitHub Blog — Engineering", url: "https://github.blog/engineering/feed/" },
  { name: "Martin Fowler", url: "https://martinfowler.com/feed.atom" },
];

/**
 * The fixed tag vocabulary. The model must pick from this list rather than
 * inventing its own, which is what keeps the UI filters stable over time.
 */
export const TAGS = [
  "ai", "llm", "web", "frontend", "backend", "database", "devops",
  "cloud", "security", "performance", "language", "tooling",
  "architecture", "career", "opensource", "hardware",
] as const;
