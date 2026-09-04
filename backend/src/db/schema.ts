import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const articles = sqliteTable("articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull(),
  canonicalUrl: text("canonical_url").notNull(),
  dedupeKey: text("dedupe_key").notNull(),
  title: text("title").notNull(),
  /** 'hn' | 'reddit' | 'rss' */
  source: text("source").notNull(),
  /** Display name: 'Hacker News', 'r/programming', 'Cloudflare Blog' */
  sourceName: text("source_name").notNull(),
  discussUrl: text("discuss_url"),
  author: text("author"),
  points: integer("points").notNull().default(0),
  numComments: integer("num_comments").notNull().default(0),
  /** unix seconds */
  publishedAt: integer("published_at"),
  fetchedAt: integer("fetched_at").notNull(),
  /** Full article text, extracted with Readability */
  content: text("content"),
  /** Model-generated summary (written in Vietnamese — see ingest/summarize.ts) */
  summary: text("summary"),
  /** JSON array */
  tags: text("tags"),
  /** 0-100 relevance score assigned by the model */
  score: integer("score"),
  /** 'new' | 'summarized' | 'failed' | 'skipped' */
  status: text("status").notNull().default("new"),
  error: text("error"),
  readAt: integer("read_at"),
  saved: integer("saved").notNull().default(0),
  /** How many times extraction has been attempted, so a permanently blocked URL
   *  (403, paywall, non-HTML) stops being retried instead of looping forever. */
  contentTries: integer("content_tries").notNull().default(0),
});

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
