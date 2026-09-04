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

/**
 * RSS / Atom feeds.
 *
 * Weighted towards people writing about how they actually work, rather than outlets
 * announcing what shipped — the scoring rubric in ingest/summarize.ts sends
 * announcements to the bottom anyway, so feeds that only carry news mostly waste
 * summarize budget.
 */
export const RSS: RssSource[] = [
  { name: "Lobsters", url: "https://lobste.rs/rss" },
  { name: "Cloudflare Blog", url: "https://blog.cloudflare.com/rss/" },
  { name: "GitHub Blog — Engineering", url: "https://github.blog/engineering/feed/" },
  { name: "Martin Fowler", url: "https://martinfowler.com/feed.atom" },
  // Day-to-day practitioner notes on actually using LLMs and coding agents.
  { name: "Simon Willison", url: "https://simonwillison.net/atom/everything/" },
  // Engineering practice and how teams organize themselves.
  { name: "Pragmatic Engineer", url: "https://newsletter.pragmaticengineer.com/feed" },
  // How working with AI changes the work itself, rather than what models can do.
  { name: "One Useful Thing", url: "https://www.oneusefulthing.org/feed" },
];

/**
 * The fixed tag vocabulary. The model must pick from this list rather than
 * inventing its own, which is what keeps the UI filters stable over time.
 */
export const TAGS = [
  // 'workflow' and 'agents' exist so the two things this reader cares about most —
  // ways of working, and how people actually drive coding agents — are filterable
  // in the UI rather than buried under the generic 'ai' tag.
  "workflow", "agents",
  "ai", "llm", "web", "frontend", "backend", "database", "devops",
  "cloud", "security", "performance", "language", "tooling",
  "architecture", "career", "opensource", "hardware",
] as const;
