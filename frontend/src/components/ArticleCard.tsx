import type { Article } from "../lib/api";

function timeAgo(unix: number | null): string {
  if (!unix) return "";
  const mins = Math.floor((Date.now() / 1000 - unix) / 60);
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "hôm qua" : `${days} ngày trước`;
}

/** The bands are the rubric's own: 80+ changes how you work, 50+ is worth knowing,
 *  below that is filler. Colour says which band at a glance so the number itself
 *  only has to be read when the reader is deciding between two close articles. */
function band(score: number | null) {
  if (score === null) return { color: "var(--color-band-low)", label: "chưa chấm" };
  if (score >= 80) return { color: "var(--color-band-high)", label: "đổi cách làm việc" };
  if (score >= 50) return { color: "var(--color-band-mid)", label: "đáng đọc" };
  return { color: "var(--color-band-low)", label: "tin vụn" };
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
  const { color, label } = band(article.score);

  return (
    <article
      /* Read rows dim, but not below legibility: at 0.55 a read title fell to 4:1 on
         the light background. 0.68 still reads as clearly spent. */
      className={`group border-b border-[var(--color-line-soft)] transition-colors duration-150 hover:bg-[var(--color-surface)] ${
        article.read ? "opacity-[0.68]" : ""
      }`}
    >
      <div className="mx-auto flex max-w-3xl gap-4 px-5 py-5 sm:gap-5 sm:px-6">
        {/* Score sits in its own gutter, aligned to the title's cap height, so the
            eye can run straight down the column of numbers when scanning. */}
        <div className="w-9 shrink-0 pt-0.5 text-right">
          <div
            className="text-[19px] font-semibold leading-none tabular-nums"
            style={{ color }}
            title={label}
          >
            {article.score ?? "—"}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-[15.5px] font-semibold leading-snug tracking-[-0.01em] text-balance">
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => onRead(article.id, true)}
              className="text-[var(--color-title)] decoration-[var(--color-faint)] underline-offset-[3px] hover:underline"
            >
              {article.title}
            </a>
          </h2>

          {article.summary && (
            /* 68ch, not the width of the window. This is the whole reason the feed
               is a centred column instead of edge-to-edge. */
            <p className="prose-vn mt-2 max-w-[68ch] text-[13.5px] leading-[1.65] text-[var(--color-body)]">
              {article.summary}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[12px] text-[var(--color-faint)]">
            <span className="text-[var(--color-muted)]">{article.source_name}</span>
            <span aria-hidden>·</span>
            <span>{timeAgo(article.published_at)}</span>
            {article.points > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="tabular-nums">{article.points} điểm</span>
              </>
            )}

            {article.tags.length > 0 && <span className="w-1" />}
            {article.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTag(tag)}
                className="rounded-[4px] bg-[var(--color-raised)] px-1.5 py-[3px] text-[11.5px] text-[var(--color-muted)] transition-colors duration-150 hover:bg-[var(--color-accent-dim)] hover:text-[var(--color-title)]"
              >
                {tag}
              </button>
            ))}

            {/* Row actions stay invisible until the row is hovered or focused, so a
                screenful of articles reads as titles rather than as buttons. */}
            <div className="ml-auto flex items-center gap-3 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100">
              {article.discuss_url && (
                <a
                  href={article.discuss_url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[var(--color-body)]"
                >
                  thảo luận ↗
                </a>
              )}
              <button
                onClick={() => onSave(article.id, !article.saved)}
                className={
                  article.saved
                    ? "text-[var(--color-band-mid)]"
                    : "hover:text-[var(--color-body)]"
                }
                aria-pressed={article.saved}
              >
                {article.saved ? "★ đã lưu" : "☆ lưu"}
              </button>
              <button
                onClick={() => onRead(article.id, !article.read)}
                className="hover:text-[var(--color-body)]"
                aria-pressed={article.read}
              >
                {article.read ? "đánh dấu chưa đọc" : "đánh dấu đã đọc"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
