import { useCallback, useEffect, useState } from "react";
import { ThemeToggle } from "./components/ThemeToggle";
import {
  fetchArticles, fetchStats, markRead, markSaved,
  type Article, type Stats, type Query,
} from "./lib/api";
import { ArticleCard } from "./components/ArticleCard";
import { Sidebar } from "./components/Sidebar";

export default function App() {
  // No default minScore: the real filter is the topic gate, applied by the API — an
  // article matching none of the reader's topics never reaches here. Score only sorts.
  const [query, setQuery] = useState<Query>({ filter: "all", sort: "score" });
  const [search, setSearch] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Wait 250ms after the last keystroke before querying, so typing doesn't
  // fire one request per character.
  useEffect(() => {
    const t = setTimeout(() => setQuery((q) => ({ ...q, q: search || undefined })), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    fetchArticles(query)
      .then((a) => { setArticles(a); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [query]);

  const reloadStats = useCallback(() => {
    fetchStats().then(setStats).catch(() => {});
  }, []);
  useEffect(reloadStats, [reloadStats]);

  // Update local state first, then call the API, so the button never feels laggy.
  const onRead = (id: number, read: boolean) => {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, read } : a)));
    markRead(id, read).then(reloadStats);
  };
  const onSave = (id: number, saved: boolean) => {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, saved } : a)));
    markSaved(id, saved).then(reloadStats);
  };

  const patch = (p: Partial<Query>) => setQuery((q) => ({ ...q, ...p }));

  return (
    /* The sidebar and the reading column are centred as one unit. Pinning the sidebar
       to the viewport edge while centring the text inside everything left over opens a
       dead gutter between them that gets wider on every larger screen. */
    <div className="mx-auto flex min-h-screen max-w-[1180px]">
      <Sidebar stats={stats} query={query} onChange={patch} />

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-5 py-3 sm:px-6">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              aria-label="Tìm kiếm bài viết"
              className="w-full min-w-0 sm:w-auto sm:flex-1 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-[13px] text-[var(--color-title)] transition-colors duration-150 placeholder:text-[var(--color-faint)] hover:border-[var(--color-faint)] focus:border-[var(--color-accent)]"
            />

            <select
              value={query.sort}
              onChange={(e) => patch({ sort: e.target.value as Query["sort"] })}
              aria-label="Sắp xếp"
              className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1.5 text-[13px] text-[var(--color-muted)] transition-colors duration-150 hover:border-[var(--color-faint)] hover:text-[var(--color-body)]"
            >
              <option value="score">Theo điểm</option>
              <option value="new">Mới nhất</option>
            </select>

            <select
              value={query.minScore ?? 0}
              onChange={(e) => patch({ minScore: Number(e.target.value) })}
              aria-label="Lọc theo điểm"
              className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1.5 text-[13px] text-[var(--color-muted)] transition-colors duration-150 hover:border-[var(--color-faint)] hover:text-[var(--color-body)]"
            >
              <option value={0}>Mọi mức điểm</option>
              <option value={50}>Đáng đọc · ≥ 50</option>
              <option value={80}>Đổi cách làm việc · ≥ 80</option>
            </select>

            <ThemeToggle />

            {(query.tag || query.source) && (
              <button
                onClick={() => patch({ tag: undefined, source: undefined })}
                className="rounded-[6px] px-2 py-1.5 text-[12.5px] text-[var(--color-muted)] transition-colors duration-150 hover:text-[var(--color-title)]"
              >
                Bỏ lọc{query.tag ? ` "${query.tag}"` : ""}
                {query.source ? ` "${query.source}"` : ""} ✕
              </button>
            )}
          </div>
        </header>

        {error && (
          <p className="mx-auto max-w-3xl px-6 py-10 text-[13.5px] text-[var(--color-danger)]">
            Không tải được: {error}
          </p>
        )}

        {/* Skeletons rather than a spinner: the shape of the answer is already known,
            and a placeholder that matches it stops the page jumping when data lands. */}
        {!error && loading && articles.length === 0 && (
          <div aria-hidden className="mx-auto max-w-3xl px-5 sm:px-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-5 border-b border-[var(--color-line-soft)] py-5">
                <div className="h-4 w-9 shrink-0 rounded bg-[var(--color-surface)]" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 w-2/3 rounded bg-[var(--color-surface)]" />
                  <div className="h-3 w-full rounded bg-[var(--color-surface)]/70" />
                  <div className="h-3 w-4/5 rounded bg-[var(--color-surface)]/70" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!error && !loading && articles.length === 0 && (
          <div className="mx-auto max-w-lg px-6 py-20 text-center">
            {/* An empty filter and an empty database look identical to the reader but
                mean opposite things, so they must never share a message. */}
            {(query.minScore ?? 0) > 0 || query.tag || query.source || query.q ? (
              <>
                <p className="text-[14px] text-[var(--color-body)]">
                  Không có bài nào khớp bộ lọc hiện tại.
                </p>
                <button
                  onClick={() =>
                    patch({ minScore: 0, tag: undefined, source: undefined })
                  }
                  className="mt-3 text-[13px] text-[var(--color-accent)] hover:underline"
                >
                  Bỏ hết bộ lọc
                </button>
              </>
            ) : (
              <>
                <p className="text-[14px] text-[var(--color-body)]">
                  Chưa có bài nào được tóm tắt.
                </p>
                <p className="mt-2 text-[13px] text-[var(--color-muted)]">
                  Chạy{" "}
                  <code className="rounded bg-[var(--color-raised)] px-1.5 py-0.5 text-[12px] text-[var(--color-body)]">
                    pnpm ingest
                  </code>{" "}
                  để thu tin về.
                </p>
              </>
            )}
          </div>
        )}

        {articles.map((a) => (
          <ArticleCard
            key={a.id}
            article={a}
            onRead={onRead}
            onSave={onSave}
            onTag={(tag) => patch({ tag })}
          />
        ))}
      </main>
    </div>
  );
}
