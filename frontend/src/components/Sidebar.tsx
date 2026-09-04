import { useState } from "react";
import type { Stats, Query } from "../lib/api";

/** The topic vocabulary has 44 entries, so a flat list of every tag that has ever
 *  appeared would push sources off the screen. Show the ones that carry weight and
 *  let the reader open the rest. */
const TAGS_SHOWN = 8;

function Item({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center justify-between gap-2 rounded-[5px] px-2 py-[5px] text-left text-[13px] transition-colors duration-150 ${
        active
          ? "bg-[var(--color-accent-dim)] text-[var(--color-title)]"
          : "text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-body)]"
      }`}
    >
      <span className="truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="shrink-0 text-[11.5px] tabular-nums text-[var(--color-faint)]">
          {count}
        </span>
      )}
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-2 text-[10.5px] font-medium uppercase tracking-[0.09em] text-[var(--color-faint)]">
        {title}
      </p>
      <div className="space-y-px">{children}</div>
    </div>
  );
}

export function Sidebar({
  stats,
  query,
  onChange,
}: {
  stats: Stats | null;
  query: Query;
  onChange: (patch: Partial<Query>) => void;
}) {
  const [allTags, setAllTags] = useState(false);
  const tags = stats?.tags ?? [];
  const shown = allTags ? tags : tags.slice(0, TAGS_SHOWN);

  return (
    /* h-screen, not max-h-screen: the border-r is the divider between the sidebar
       and the feed, and a divider that stops where the tag list happens to end
       reads as an unfinished line rather than a boundary. */
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col gap-6 overflow-y-auto border-r border-[var(--color-line)] p-4 max-lg:hidden">
      <div>
        <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-title)]">
          radar
        </h1>
        <p className="mt-0.5 text-[11.5px] tabular-nums text-[var(--color-faint)]">
          {stats ? `${stats.totals.total} bài · ${stats.totals.unread ?? 0} chưa đọc` : " "}
        </p>
      </div>

      <nav className="space-y-px">
        <Item
          label="Tất cả"
          active={query.filter === "all"}
          onClick={() => onChange({ filter: "all" })}
        />
        <Item
          label="Chưa đọc"
          count={stats?.totals.unread}
          active={query.filter === "unread"}
          onClick={() => onChange({ filter: "unread" })}
        />
        <Item
          label="Đã lưu"
          count={stats?.totals.saved}
          active={query.filter === "saved"}
          onClick={() => onChange({ filter: "saved" })}
        />
      </nav>

      {tags.length > 0 && (
        <Group title="Chủ đề">
          {shown.map((t) => (
            <Item
              key={t.tag}
              label={t.tag}
              count={t.count}
              active={query.tag === t.tag}
              onClick={() => onChange({ tag: query.tag === t.tag ? undefined : t.tag })}
            />
          ))}
          {tags.length > TAGS_SHOWN && (
            <button
              onClick={() => setAllTags((v) => !v)}
              className="w-full px-2 pt-1 text-left text-[11.5px] text-[var(--color-faint)] hover:text-[var(--color-body)]"
            >
              {allTags ? "thu gọn" : `còn ${tags.length - TAGS_SHOWN} chủ đề nữa`}
            </button>
          )}
        </Group>
      )}

      {(stats?.sources.length ?? 0) > 0 && (
        <Group title="Nguồn">
          {stats!.sources.map((s) => (
            <Item
              key={s.source}
              label={s.source}
              count={s.count}
              active={query.source === s.source}
              onClick={() =>
                onChange({ source: query.source === s.source ? undefined : s.source })
              }
            />
          ))}
        </Group>
      )}
    </aside>
  );
}
