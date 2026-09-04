/** A raw item from one source, before normalization and insertion. */
export type RawItem = {
  url: string;
  title: string;
  source: "hn" | "reddit" | "rss";
  sourceName: string;
  /** Link to the discussion page (HN thread, Reddit permalink) */
  discussUrl?: string;
  author?: string;
  points?: number;
  numComments?: number;
  /** unix seconds */
  publishedAt?: number;
};

export const USER_AGENT =
  "radar/0.1 (personal news reader; +https://github.com/local/radar)";
