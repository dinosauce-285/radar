/**
 * ==========================================================================
 *  SOURCE LIST — edit this file to change what you read.
 *  These are generic defaults. Add or remove entries freely; nothing else in
 *  the codebase depends on the specific values.
 * ==========================================================================
 */

export type RssSource = {
  name: string;
  url: string;
  /** Skip items older than this many days. Defaults to 14. */
  maxAgeDays?: number;
};

/** Hacker News, queried through the Algolia API. */
export const HN = {
  enabled: true,
  /** Only take stories above this score. Raise it if the feed is too noisy. */
  minPoints: 100,
  /** How many hours back to look. */
  windowHours: 48,
  limit: 60,
};

/** Subreddits, read through the public .json endpoints. No API key needed. */
export const REDDIT = {
  enabled: true,
  subreddits: ["programming", "webdev"],
  /** 'hot' | 'top' | 'new' */
  sort: "top" as const,
  /** Only applies when sort is 'top': hour | day | week | month */
  timeframe: "day" as const,
  minUpvotes: 200,
  limitPerSub: 25,
};

/**
 * RSS / Atom feeds.
 *
 * Weighted towards people writing about how they actually work, rather than outlets
 * announcing what shipped — the scoring rubric in ingest/summarize.ts sends
 * announcements to the bottom anyway, so feeds that only carry news mostly waste
 * summarize budget.
 */
export const RSS: RssSource[] = [
  { name: "Lobsters",                   url: "https://lobste.rs/rss" },
  { name: "Cloudflare Blog",            url: "https://blog.cloudflare.com/rss/" },
  { name: "GitHub Blog — Engineering", url: "https://github.blog/engineering/feed/" },
  { name: "Martin Fowler",              url: "https://martinfowler.com/feed.atom" },
  { name: "Simon Willison",             url: "https://simonwillison.net/atom/everything/" },
  { name: "Pragmatic Engineer",         url: "https://newsletter.pragmaticengineer.com/feed" },
  { name: "One Useful Thing",           url: "https://www.oneusefulthing.org/feed" },
  { name: "Geoffrey Huntley",           url: "https://ghuntley.com/rss/" },
  { name: "Addy Osmani",                url: "https://addyosmani.com/rss.xml" },
  { name: "Armin Ronacher",             url: "https://lucumr.pocoo.org/feed.atom" },
  { name: "Sourcegraph",                url: "https://sourcegraph.com/blog/rss.xml" },
  { name: "Hamel Husain",               url: "https://hamel.dev/index.xml" },
  { name: "Scott Spence",               url: "https://scottspence.com/rss.xml" },
  { name: "Vicki Boykis",               url: "https://vickiboykis.com/index.xml" },
  { name: "Baldur Bjarnason",           url: "https://www.baldurbjarnason.com/feed.xml" },
  { name: "Import AI",                  url: "https://importai.substack.com/feed" },
  { name: "Interconnects",              url: "https://www.interconnects.ai/feed" },
  { name: "Ahead of AI",                url: "https://magazine.sebastianraschka.com/feed" },
  { name: "Dan Luu",                    url: "https://danluu.com/atom.xml" },
  { name: "Kent Beck",                  url: "https://tidyfirst.substack.com/feed" },
  { name: "Dan North",                  url: "https://dannorth.net/index.xml" },
  { name: "Hillel Wayne",               url: "https://hillelwayne.com/index.xml" },
  { name: "Marc Brooker",               url: "https://brooker.co.za/blog/rss.xml" },
  { name: "Brandur",                    url: "https://brandur.org/articles.atom" },
  { name: "Ink & Switch",               url: "https://www.inkandswitch.com/index.xml" },
  { name: "PlanetScale",                url: "https://planetscale.com/blog/rss.xml" },
  { name: "Neon",                       url: "https://neon.tech/blog/rss.xml" },
  { name: "ByteByteGo",                 url: "https://blog.bytebytego.com/feed" },
  { name: "Jane Street",                url: "https://blog.janestreet.com/feed.xml" },
  { name: "Oxide Computer",             url: "https://oxide.computer/blog/feed" },
  { name: "High Scalability",           url: "https://highscalability.com/rss/" },
  { name: "AWS Architecture",           url: "https://aws.amazon.com/blogs/architecture/feed/" },
  { name: "AWS Compute",                url: "https://aws.amazon.com/blogs/compute/feed/" },
  { name: "Meta Engineering",           url: "https://engineering.fb.com/feed/" },
  { name: "Shopify Engineering",        url: "https://shopify.engineering/blogs/engineering.atom" },
  { name: "Lorin Hochstein",            url: "https://surfingcomplexity.blog/feed/" },
  { name: "Honeycomb",                  url: "https://www.honeycomb.io/feed" },
  { name: "Charity Majors",             url: "https://charity.wtf/feed/" },
  { name: "Fly.io",                     url: "https://fly.io/blog/feed.xml" },
  { name: "Tailscale",                  url: "https://tailscale.com/blog/index.xml" },
  { name: "Netflix TechBlog",           url: "https://netflixtechblog.com/feed" },
  { name: "PortSwigger Research",       url: "https://portswigger.net/research/rss" },
  { name: "Troy Hunt",                  url: "https://feeds.feedburner.com/TroyHunt" },
  { name: "Project Zero",               url: "https://googleprojectzero.blogspot.com/feeds/posts/default" },
  { name: "Google Security",            url: "https://security.googleblog.com/feeds/posts/default" },
  { name: "Will Larson",                url: "https://lethain.com/feeds/" },
  { name: "Rands in Repose",            url: "https://randsinrepose.com/feed/" },
  { name: "Refactoring",                url: "https://refactoring.fm/feed" },
  { name: "Bootstrapped Founder",       url: "https://thebootstrappedfounder.com/feed/" },
  { name: "37signals HEY World",        url: "https://world.hey.com/jason/feed.atom" },
  { name: "Camille Fournier",           url: "https://skamille.medium.com/feed" },
  { name: "Julia Evans",                url: "https://jvns.ca/atom.xml" },
  { name: "Josh Comeau",                url: "https://www.joshwcomeau.com/rss.xml" },
  { name: "Modern CSS",                 url: "https://moderncss.dev/feed/" },
  { name: "CSS Wizardry",               url: "https://csswizardry.com/feed.xml" },
  { name: "Jake Archibald",             url: "https://jakearchibald.com/posts.rss" },
  { name: "Lea Verou",                  url: "https://lea.verou.me/feed.xml" },
  { name: "CSS-Tricks",                 url: "https://css-tricks.com/feed/" },
  { name: "Smashing Magazine",          url: "https://www.smashingmagazine.com/feed/" },
  { name: "Nolan Lawson",               url: "https://nolanlawson.com/feed/" },
  { name: "Ahmad Shadeed",              url: "https://ishadeed.com/feed.xml" },
  { name: "web.dev",                    url: "https://web.dev/static/blog/feed.xml" },
  { name: "Kent C. Dodds",              url: "https://kentcdodds.com/blog/rss.xml" },
  { name: "JetBrains",                  url: "https://blog.jetbrains.com/feed/" },
  { name: "Mozilla Hacks",              url: "https://hacks.mozilla.org/feed/" },
  { name: "Chrome Developers",          url: "https://developer.chrome.com/static/blog/feed.xml" },
  { name: "Deno",                       url: "https://deno.com/feed" },
  { name: "Bun",                        url: "https://bun.sh/rss.xml" },
  { name: "Fabien Sanglard",            url: "https://fabiensanglard.net/rss.xml" },
  { name: "Chris Wellons",              url: "https://nullprogram.com/feed/" },
  { name: "Bartosz Ciechanowski",       url: "https://ciechanow.ski/atom.xml" },
  { name: "Computer Enhance",           url: "https://www.computerenhance.com/feed" },
  { name: "Cloudflare Research",        url: "https://blog.cloudflare.com/tag/research/rss/" },
  { name: "Discord",                    url: "https://discord.com/blog/rss.xml" },
  { name: "Stripe",                     url: "https://stripe.com/blog/feed.rss" },
  { name: "Antithesis",                 url: "https://antithesis.com/blog/rss.xml" },
  { name: "Eugene Yan",                 url: "https://eugeneyan.com/rss/" },
  { name: "Chip Huyen",                 url: "https://huyenchip.com/feed.xml" },
  { name: "Thoughtworks Insights",      url: "https://www.thoughtworks.com/rss/insights.xml" },
  { name: "Changelog",                  url: "https://changelog.com/feed" },
  { name: "Microsoft DevBlogs",         url: "https://devblogs.microsoft.com/feed/" },
  { name: "Dropbox Tech",               url: "https://dropbox.tech/feed" },
  { name: "Spotify Engineering",        url: "https://engineering.atspotify.com/feed/" },
  { name: "Slack Engineering",          url: "https://slack.engineering/feed/" },

  /**
   * GitHub Trending. Not an article feed: each item is a repository, and the text the
   * extractor pulls is its README. A repo is "a thing that exists", which the rubric
   * pushes into 0-49 — correct, and it does not hide them, because the feed gates on
   * topic rather than score. A trending Neovim plugin still gets tagged `editor` and
   * appears, ranked below writing that changes how you work.
   *
   * There is no official trending API; this is the community mirror. maxAgeDays is 3
   * because the feed is a daily snapshot of what is hot now — a fortnight of old
   * snapshots is not a trend, it is noise.
   */
  { name: "GitHub Trending",            url: "https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml", maxAgeDays: 3 },
];

/**
 * The reader's topic vocabulary, taken from the interest profile they filled in
 * rather than from generic tech categories. This is what the feed filters on: an
 * article that matches none of these is not shown, so the list has to describe
 * what this particular reader wants, not what the industry writes about.
 *
 * The model must choose from this list and MAY return an empty array — that is the
 * signal for "nothing here for this reader", and it is how irrelevant articles get
 * kept out of the feed.
 */
export const TAGS = [
  // driving coding agents
  "agents", "agent-cost", "agent-tooling",
  // working alongside AI
  "ai-skills", "ai-industry", "ai-products", "prompting",
  // craft
  "refactoring", "code-review", "code-reading",
  // architecture
  "architecture", "api-design", "database", "db-internals", "caching",
  "queues", "reliability", "realtime", "local-first",
  // production
  "observability", "incident", "deploy", "performance", "scaling",
  "infra-cost", "oncall",
  // security
  "security", "llm-security",
  // career
  "job-market", "career-path", "indie", "burnout",
  // team
  "process", "tech-decisions",
  // tools
  "git", "terminal", "editor", "ci-cd", "frontend", "css", "backend",
  // fundamentals
  "networking", "os", "algorithms",
] as const;
