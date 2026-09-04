# radar — product context

## What it is

A personal tech-news reader for one person. It pulls articles from Hacker News and 84
RSS feeds, has an LLM summarize each one in Vietnamese, tag it against the reader's own
topic vocabulary, and score it 0–100 on a single question: *after reading this, would a
working programmer do something differently?*

Articles matching none of the reader's topics never reach the feed at all. Roughly half
of what gets summarized is filtered out this way.

## Who uses it

One Vietnamese software developer, on their own machine. Not a product with users — a
tool with an owner. No auth, no accounts, no sharing.

## The scene

Sitting down at a desk, morning or between tasks, wanting to know what happened that is
worth acting on. Twelve new articles a day, not a firehose. The reader scans scores and
titles, reads two or three summaries, opens maybe one. Sessions are short and repeated.

That scene decides the theme: this is a tool opened in a terminal-adjacent workflow,
alongside an editor. The room is dark at night and bright by day, and the reader switches
editor themes with it — so the app ships both, following the OS by default and letting an
explicit choice override it in either direction. Neither theme is a stripped-down version
of the other.

## Register

**Product.** Design serves the task. The reader is deciding what to read, not admiring
the interface. Familiarity is a feature; the tool should disappear.

## Language

The interface and the summaries are Vietnamese, with full diacritics. The codebase,
comments and this file are English. Technical terms stay English inside Vietnamese prose
(deploy, cache, runtime) rather than being force-translated.

## What matters most, in order

1. **Deciding fast.** Score, title, and topic tags carry the decision. Everything else is
   secondary and should read as secondary.
2. **Reading comfortably.** Summaries are 2–3 sentences of Vietnamese prose and need a
   real measure, not the full width of a 1440px window.
3. **Filtering by topic.** The topic vocabulary is the reader's own; picking one should
   be one click and obviously reversible.
4. **Density without noise.** Twelve articles a day means the whole day fits on a screen
   or two. Density is welcome; visual noise is not.

## Existing commitments

- The dark surfaces `#0f1115` / `#161a21` / `#232833` are the project's identity; refine
  around them rather than replacing them. The light palette is the same cool blue-grey
  hue family inverted, never a warm cream — the two must read as one product.
- Every component reads a `--color-*` token and never a literal colour. A theme is a
  block of redefinitions, not a second set of classes.
- Both text ramps clear WCAG AA against their own background, `--color-faint` (the
  smallest meta text) included, measured against the row hover surface as well as the
  page.
- Score bands carry meaning and already have colors: ≥80, ≥50, below.
- Tailwind v4 with `@theme`, React 19, no component library.
