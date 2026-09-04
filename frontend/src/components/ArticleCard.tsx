import type { Article } from "../lib/api";

function timeAgo(unix: number | null): string {
  if (!unix) return "";
  const mins = Math.floor((Date.now() / 1000 - unix) / 60);
  if (mins < 60) return `${mins}p truoc`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h truoc`;
  return `${Math.floor(hours / 24)} ngay truoc`;
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-slate-500";
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-slate-500";
}

export function ArticleCard({
  article,
  onRead,
  onSave,
  onTag,
}: {
  article: Article;
  onRead: (id: number, read: boolean) => void;
  onSave: (id: number, saved: boolean) => void;
  onTag: (tag: string) => void;
}) {
  return (
    <article
      className={`border-b border-[var(--color-line)] px-5 py-4 transition-colors hover:bg-white/[0.02] ${
        article.read ? "opacity-45" : ""
      }`}
    >
      <div className="flex items-baseline gap-3">
        <span className={`w-8 shrink-0 text-sm font-semibold tabular-nums ${scoreColor(article.score)}`}>
          {article.score ?? "—"}
        </span>

        <div className="min-w-0 flex-1">
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => onRead(article.id, true)}
            className="text-[15px] font-medium text-slate-100 hover:text-sky-300"
          >
            {article.title}
          </a>

          {article.summary && (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
              {article.summary}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="text-slate-400">{article.source_name}</span>
            {article.points > 0 && <span>{article.points} diem</span>}
            <span>{timeAgo(article.published_at)}</span>

            {article.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTag(tag)}
                className="rounded bg-white/5 px-1.5 py-0.5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              >
                {tag}
              </button>
            ))}

            {article.discuss_url && (
              <a
                href={article.discuss_url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-300"
              >
                thao luan →
              </a>
            )}

            <button
              onClick={() => onSave(article.id, !article.saved)}
              className={`ml-auto ${article.saved ? "text-amber-400" : "hover:text-slate-300"}`}
            >
              {article.saved ? "★ da luu" : "☆ luu"}
            </button>
            <button
              onClick={() => onRead(article.id, !article.read)}
              className="hover:text-slate-300"
            >
              {article.read ? "danh dau chua doc" : "danh dau da doc"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
