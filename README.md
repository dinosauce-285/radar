# radar

A personal tech-news reader. It pulls stories from Hacker News, Reddit and a set of
RSS feeds, extracts the article text, and has an LLM summarize and score each one so
a short daily skim replaces an hour of open tabs.

Summaries are written in Vietnamese, and so is the UI — the app is built for a
Vietnamese reader. The codebase itself is in English.

## Stack

- **Backend** — Hono, better-sqlite3 + Drizzle, SQLite FTS5 for search
- **Frontend** — React 19, Vite, Tailwind v4
- **Summarization** — Groq (`groq-sdk`), any chat model the account has access to

Single SQLite file, no external services, no migration tool. It is a one-user app and
the schema is applied idempotently on startup.

## Setup

```bash
pnpm install
cp .env.example .env      # then paste your Groq API key
pnpm build
```

Get a key at [console.groq.com/keys](https://console.groq.com/keys). Without one the
app still runs and still collects articles — it just skips the summarize step, and
the UI stays empty because it only shows summarized articles.

## Running

```bash
pnpm dev       # Vite on :5173, Hono on :3000, /api proxied
pnpm ingest    # fetch + summarize once
pnpm start     # serve the built UI and API from :3000
```

In production the backend serves the frontend build itself, so everything is one
origin and CORS never comes up.

## How ingest works

1. **Fetch** — HN (Algolia API), Reddit (public `.json` endpoints), RSS feeds in parallel.
   One source failing never sinks the others.
2. **Deduplicate** — URLs are canonicalized (tracking params, fragments, `www` and
   trailing slashes stripped), plus a secondary `sha1(host|normalized-title)` key that
   catches the same article living at two URLs.
3. **Extract** — Readability, the engine behind Firefox's Reader View, pulls the main
   text. Failure here is not fatal; the article is stored without full text.
4. **Summarize** — Groq returns a summary, 1-3 tags from a fixed vocabulary, and a
   0-100 score. The result is validated with Zod before it is written.

Only articles that reach `status = 'summarized'` appear in the UI.

## Configuration

Sources live in [`backend/src/ingest/sources.ts`](backend/src/ingest/sources.ts) —
subreddits, feeds, score thresholds and the tag vocabulary. Nothing else depends on
those values, so edit freely.

Everything else is in `.env`: model, per-run summarize cap, request concurrency, port.

## Scheduled runs

`deploy/` has a systemd **user** timer that runs ingest every 30 minutes:

```bash
./deploy/install-timer.sh    # no sudo needed
```

## Notes

- Not every Groq model supports `json_schema` structured output. The code tries it
  first and falls back to `json_object` automatically, keeping the choice for the
  rest of the run.
- `MAX_SUMMARIZE_PER_RUN` is a deliberate cost guard, so a feed that suddenly dumps
  hundreds of items cannot turn into a surprise bill.
