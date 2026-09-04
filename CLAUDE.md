# radar

A personal tech-news reader for one person. Pulls articles from Hacker News and 84 RSS
feeds, has an LLM summarize each one in Vietnamese, tag it against the reader's own topic
vocabulary, and score it. Single SQLite file, no external services, no accounts.

## Commands

```bash
pnpm install
pnpm dev          # Vite on :5173, Hono on :3000, /api proxied
pnpm ingest       # fetch + extract + summarize once
pnpm build        # frontend then backend
pnpm start        # serve the built UI and API from :3000
pnpm typecheck    # both workspaces
```

There are no tests. Verification is running `pnpm typecheck`, `pnpm build`, and `pnpm
ingest` and reading what they actually print.

## Language

**The codebase is English** — comments, log output, commit messages, this file.
**The app is Vietnamese** — every UI label and every generated summary, with full
diacritics. The prompt in `summarize.ts` is written in English but instructs the model to
answer in Vietnamese; that is deliberate and not an inconsistency to "fix".

Technical terms stay English inside Vietnamese prose (deploy, cache, runtime).

## The pipeline

`backend/src/ingest/index.ts` runs five stages in order:

1. **fetch** — HN via the Algolia API, RSS feeds, Reddit. Capped at 6 concurrent
   connections; firing all 84 at once silently lost dozens to timeouts.
2. **dedupe** — canonical URL plus a `sha1(host|normalized-title)` secondary key.
3. **extract** — Readability. Failure is not fatal; the article is stored without text.
4. **summarize** — Groq returns a Vietnamese summary, topics, and a score.
5. **display** — only articles that reach `status='summarized'` **and carry at least one
   topic** appear in the feed.

## Rules that are load-bearing

**Score means "would I work differently after reading this", not "is this important".**
Announcements — model launches, funding, benchmarks — are meant to land in 0-49. A #1
Hacker News story about a new model scoring 20 is the rubric working, not a bug. Do not
reintroduce importance or popularity as a criterion.

**Topic decides visibility, score decides order.** An article tagged with none of the
reader's topics never reaches the feed regardless of score. `?offTopic=1` reveals them.

**Never score an article whose text could not be extracted above 49.** The model would
otherwise rate a headline it never read; one such article reached 75 and topped the feed.

**Articles are never dropped for failing.** `enrich()` retries `failed` rows, and a
backfill pass re-attempts extraction for articles summarized without text, up to
`content_tries` of 3.

**Every UI colour comes from a `--color-*` token.** A theme is a block of redefinitions.
A literal colour in a component breaks one of the two themes.

## Constraints worth knowing before changing anything

- **Groq allows 8000 tokens per minute** on this account, and an article costs ~5400.
  That is ~1.5 articles a minute, and it sets `MAX_SUMMARIZE_PER_RUN` and the systemd
  timeout — not machine speed.
- **`MAX_SUMMARIZE_PER_RUN` is per run, not per day.** Articles that miss a run keep
  `status='new'` and are picked up by the next one.
- **Reddit is unreachable from this machine** (connection refused in ~1ms). `Reddit: 0
  items` is expected here and is not a fetcher bug.
- **SQLite has no `ADD COLUMN IF NOT EXISTS`**, and `CREATE TABLE IF NOT EXISTS` skips an
  existing table — so a column added to `schema.sql` never reaches an existing database.
  Add an explicit guarded `ALTER` in `db/client.ts`, as `content_tries` does.
- **`maxAgeDays` is 45**, not 14. At 14, thirty-six feeds whose whole archive predates the
  window contributed nothing at all.

## Where things live

| Path | What |
|---|---|
| `backend/src/ingest/sources.ts` | Feeds, thresholds, and the topic vocabulary. Edit freely — nothing else depends on the values. |
| `backend/src/ingest/summarize.ts` | The scoring rubric and the reader's interest profile. |
| `backend/src/ingest/index.ts` | Pipeline orchestration, retry and backfill. |
| `backend/src/routes/articles.ts` | Feed query, topic gate, sidebar counters. |
| `frontend/PRODUCT.md` | Product context and design commitments. Read before changing the UI. |
| `frontend/src/index.css` | Theme tokens for both themes. |
| `deploy/` | systemd **user** timer for ingest. No unit for the web server yet. |

## Commits

Conventional Commits, in English: `type(scope): summary`. Scopes in use are `ingest`,
`rss`, `summarize`, `feed`, `topics`, `ui`, `deploy`, `frontend`.

The body should say what was wrong and what the evidence was, not restate the diff.
