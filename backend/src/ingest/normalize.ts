import crypto from "node:crypto";

const TRACKING_PARAMS = [
  /^utm_/i, /^ref$/i, /^ref_/i, /^fbclid$/i, /^gclid$/i, /^mc_/i,
  /^igshid$/i, /^si$/i, /^source$/i, /^campaign/i, /^__twitter/i,
];

/**
 * Normalize a URL for deduplication: drop tracking params, the fragment, the www
 * prefix and any trailing slash. The same article posted to both HN and Reddit
 * collapses to an identical string.
 */
export function canonicalizeUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return raw.trim();
  }

  u.hash = "";
  u.protocol = "https:";
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");

  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAMS.some((re) => re.test(key))) u.searchParams.delete(key);
  }
  u.searchParams.sort();

  if (u.pathname !== "/" && u.pathname.endsWith("/")) {
    u.pathname = u.pathname.slice(0, -1);
  }

  let out = u.toString();
  if (out.endsWith("?")) out = out.slice(0, -1);
  return out;
}

/**
 * Secondary dedupe key, for the same article living at different URLs — a mirror,
 * say, or one copy carrying an unusual query string the canonicalizer keeps.
 */
export function dedupeKey(title: string, canonicalUrl: string): string {
  const normTitle = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  let host = "";
  try {
    host = new URL(canonicalUrl).hostname;
  } catch { /* malformed URL: fall back to hashing the title alone */ }
  return crypto.createHash("sha1").update(`${host}|${normTitle}`).digest("hex");
}
