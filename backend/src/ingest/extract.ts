import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { USER_AGENT } from "./types.js";

/** Cut off past this — mostly a guard against pages that aren't articles. */
const MAX_CHARS = 40_000;
const FETCH_TIMEOUT_MS = 20_000;

export type Extracted = { content: string; truncated: boolean };

/**
 * Fetch a URL and pull out the main content with Readability — the same engine
 * behind Firefox's Reader View. Returns null when extraction fails; the article
 * is still stored, just without full text to summarize from.
 */
export async function extractArticle(url: string): Promise<Extracted | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;

    const ctype = res.headers.get("content-type") ?? "";
    if (!ctype.includes("html")) return null;

    const html = await res.text();
    const dom = new JSDOM(html, { url });
    const article = new Readability(dom.window.document).parse();

    const text = article?.textContent?.replace(/\s+\n/g, "\n").trim();
    if (!text || text.length < 200) return null;

    const truncated = text.length > MAX_CHARS;
    return { content: truncated ? text.slice(0, MAX_CHARS) : text, truncated };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
