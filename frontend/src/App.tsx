import { useCallback, useEffect, useState } from "react";
import {
  fetchArticles, fetchStats, markRead, markSaved,
  type Article, type Stats, type Query,
} from "./lib/api";
import { ArticleCard } from "./components/ArticleCard";
import { Sidebar } from "./components/Sidebar";

export default function App() {
  // minScore 50 ngay tu dau: band 0-49 theo rubric la tin vun, doc xong quen.
  // De mac dinh 0 nghia la moi lan mo app deu phai tu tay loc chung di.
  const [query, setQuery] = useState<Query>({ filter: "all", sort: "score", minScore: 50 });
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
    <div className="flex min-h-screen">
      <Sidebar stats={stats} query={query} onChange={patch} />

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-ink)]/95 px-5 py-3 backdrop-blur">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tim kiem..."
            className="w-full max-w-md rounded border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none"
          />

          <select
            value={query.sort}
            onChange={(e) => patch({ sort: e.target.value as Query["sort"] })}
            className="rounded border border-[var(--color-line)] bg-[var(--color-panel)] px-2 py-1.5 text-sm text-slate-400 focus:outline-none"
          >
            <option value="score">Sap theo diem</option>
            <option value="new">Moi nhat</option>
          </select>

          <select
            value={query.minScore ?? 0}
            onChange={(e) => patch({ minScore: Number(e.target.value) })}
            className="rounded border border-[var(--color-line)] bg-[var(--color-panel)] px-2 py-1.5 text-sm text-slate-400 focus:outline-none"
          >
            <option value={80}>Doi cach lam viec · ≥ 80</option>
            <option value={50}>Dang doc · ≥ 50</option>
            <option value={0}>Tat ca, ke ca tin vun</option>
          </select>

          {(query.tag || query.source) && (
            <button
              onClick={() => patch({ tag: undefined, source: undefined })}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              xoa loc
            </button>
          )}
        </header>

        {error && <p className="px-5 py-8 text-sm text-red-400">Loi: {error}</p>}

        {!error && loading && articles.length === 0 && (
          <p className="px-5 py-8 text-sm text-slate-600">Dang tai...</p>
        )}

        {!error && !loading && articles.length === 0 && (
          <div className="px-5 py-16 text-center text-sm text-slate-600">
            {/* Loc rong khac han kho rong. Khong phan biet hai cai nay thi
                nguoi dung tuong ingest hong trong khi chi la nguong qua cao. */}
            {(query.minScore ?? 0) > 0 || query.tag || query.source || query.q ? (
              <>
                <p>Khong co bai nao khop bo loc hien tai.</p>
                <button
                  onClick={() => patch({ minScore: 0, tag: undefined, source: undefined })}
                  className="mt-2 text-sky-400 hover:text-sky-300"
                >
                  Bo loc, xem tat ca
                </button>
              </>
            ) : (
              <>
                <p>Chua co bai nao duoc tom tat.</p>
                <p className="mt-2">
                  Chay <code className="rounded bg-white/5 px-1.5 py-0.5 text-slate-400">pnpm ingest</code> de thu tin ve.
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
