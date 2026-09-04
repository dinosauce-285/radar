export type Article = {
  id: number;
  url: string;
  title: string;
  source: string;
  source_name: string;
  discuss_url: string | null;
  author: string | null;
  points: number;
  num_comments: number;
  published_at: number | null;
  summary: string | null;
  tags: string[];
  score: number | null;
  saved: boolean;
  read: boolean;
};

export type Stats = {
  tags: { tag: string; count: number }[];
  sources: { source: string; count: number }[];
  totals: { total: number; unread: number; saved: number };
};

export type Query = {
  q?: string;
  tag?: string;
  source?: string;
  minScore?: number;
  filter?: "all" | "unread" | "saved";
  sort?: "score" | "new";
};

// Same origin in dev (via the Vite proxy) and in prod (Hono serves the build).
const base = "/api";

export async function fetchArticles(query: Query): Promise<Article[]> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "" && v !== 0) params.set(k, String(v));
  }
  const res = await fetch(`${base}/articles?${params}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()).articles;
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${base}/stats`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export const markRead = (id: number, read: boolean) =>
  fetch(`${base}/articles/${id}/read`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ read }),
  });

export const markSaved = (id: number, saved: boolean) =>
  fetch(`${base}/articles/${id}/save`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ saved }),
  });
