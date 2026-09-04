import type { Stats, Query } from "../lib/api";

export function Sidebar({
  stats,
  query,
  onChange,
}: {
  stats: Stats | null;
  query: Query;
  onChange: (patch: Partial<Query>) => void;
}) {
  const Item = ({
    label,
    count,
    active,
    onClick,
  }: {
    label: string;
    count?: number;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm transition-colors ${
        active ? "bg-sky-500/15 text-sky-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      }`}
    >
      <span className="truncate">{label}</span>
      {count !== undefined && <span className="ml-2 text-xs text-slate-600">{count}</span>}
    </button>
  );

  return (
    <aside className="w-56 shrink-0 space-y-6 border-r border-[var(--color-line)] p-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-100">radar</h1>
        {stats && (
          <p className="mt-0.5 text-xs text-slate-600">
            {stats.totals.total} bai · {stats.totals.unread ?? 0} chua doc
          </p>
        )}
      </div>

      <nav className="space-y-0.5">
        <Item label="Tat ca" active={query.filter === "all"} onClick={() => onChange({ filter: "all" })} />
        <Item label="Chua doc" count={stats?.totals.unread} active={query.filter === "unread"} onClick={() => onChange({ filter: "unread" })} />
        <Item label="Da luu" count={stats?.totals.saved} active={query.filter === "saved"} onClick={() => onChange({ filter: "saved" })} />
      </nav>

      <div>
        <p className="mb-1.5 px-2 text-xs font-medium uppercase tracking-wide text-slate-600">Tag</p>
        <div className="space-y-0.5">
          {stats?.tags.map((t) => (
            <Item
              key={t.tag}
              label={t.tag}
              count={t.count}
              active={query.tag === t.tag}
              onClick={() => onChange({ tag: query.tag === t.tag ? undefined : t.tag })}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 px-2 text-xs font-medium uppercase tracking-wide text-slate-600">Nguon</p>
        <div className="space-y-0.5">
          {stats?.sources.map((s) => (
            <Item
              key={s.source}
              label={s.source}
              count={s.count}
              active={query.source === s.source}
              onClick={() => onChange({ source: query.source === s.source ? undefined : s.source })}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
