import Groq from "groq-sdk";
import { z } from "zod";
import { env } from "../env.js";
import { TAGS } from "./sources.js";

// Lazy on purpose: `new Groq()` THROWS immediately when GROQ_API_KEY is missing,
// and this module is imported at the top of ingest/index.ts. Constructing it at
// module scope would take down the fetch/store steps too, which need no key.
let client: Groq | null = null;
// The SDK defaults to a 60s timeout, which is not enough for a reasoning model reading a
// long article with several requests in flight — four of five test articles died on it.
// maxRetries covers 429 with backoff, which this account hits often on gpt-oss-120b.
// Two attempts still left articles failing mid-run; four lets a rate limit resolve itself
// rather than deferring the article to a later ingest.
const groq = () => (client ??= new Groq({ timeout: 150_000, maxRetries: 4 }));

const Summary = z.object({
  summary: z
    .string()
    .describe("Summary in Vietnamese, 2-3 sentences, leading with the concrete practice or shift in approach the article proposes"),
  // Deliberately z.string() and not z.enum(TAGS): an invented tag would fail the whole
  // parse and mark the article permanently 'failed' over one bad word. Unknown tags are
  // dropped below instead. The JSON Schema sent to the model still carries the enum.
  tags: z
    .array(z.string())
    .describe("Topics from the fixed list that this article genuinely addresses. Empty array if none apply."),
  score: z
    .number()
    .describe("0-100: after reading this, would a working programmer actually do something differently"),
});

export type SummaryResult = z.infer<typeof Summary>;

// Groq (OpenAI-compatible) takes JSON Schema, not Zod directly. Zod v4 already
// emits `additionalProperties: false` and a complete `required` list, which is
// exactly what strict mode wants. Only `$schema` has to go: strict mode rejects
// keys it doesn't recognize.
const { $schema: _drop, ...BASE_SCHEMA } = z.toJSONSchema(Summary) as Record<
  string,
  unknown
>;

// Zod validates leniently (see `tags` above), but the model is still shown the closed
// list — constraining it up front produces far better tag choices than correcting after.
const JSON_SCHEMA = {
  ...BASE_SCHEMA,
  properties: {
    ...(BASE_SCHEMA.properties as Record<string, unknown>),
    tags: { type: "array", items: { type: "string", enum: [...TAGS] } },
  },
};

// Written in English, but it deliberately asks for Vietnamese summaries: the
// reader of this app is Vietnamese, so the output language is a product decision,
// not an artifact of how the prompt happens to be written.
//
// The scoring rubric is the heart of this app. It ranks by "would I work differently
// after reading this", NOT by importance or popularity. Announcements score low on
// purpose, however big the news — that is the point, not an oversight.
const SYSTEM = `You are a tech-news assistant for a Vietnamese software developer.

This reader is not trying to keep up with announcements. They are looking for articles
that change how they work. A model example of what they want: a post explaining how to
orchestrate several coding agents across separate git worktrees, read by someone who
until then had only ever prompted in a single session. After reading it, they do the
job differently. What they do not want is the article that is interesting to read and
forgotten a week later.

For each article you are given:
1. Summarize IN VIETNAMESE, 2-3 sentences. Lead with the concrete practice, technique
   or change in approach the article actually proposes. Do not restate the headline.
   If the article proposes nothing a reader could act on, say that plainly rather than
   dressing it up as insight.
2. Tag the article with the topics from this list that it GENUINELY addresses:
   ${TAGS.join(", ")}
   Pick at most 3, and only ones the article is actually about — not ones it mentions in
   passing. If none of them apply, return an empty array. An empty array is a normal,
   expected answer, not a failure: it is how an article that has nothing for this reader
   is kept out of their feed. Do not stretch to find a tag.
3. Score 0-100 on a single question: after reading this, would a working programmer
   do something differently?
   - 80-100: a concrete way of working they could adopt this week — a technique,
     workflow, or structure, best of all with the author's hard-won detail about what
     broke and why. Or something that reframes a problem the reader already has.
   - 50-79: real knowledge worth having that does not change what they do tomorrow —
     solid explanations, post-mortems, deep dives into how something works.
   - 0-49: news that something exists or happened. Model and product launches and what
     they can do, funding, acquisitions, benchmarks, roadmaps, release notes. Also
     opinion pieces, drama, listicles, and marketing. "Interesting, then forgotten"
     belongs in this band no matter how popular the article is.

Popularity is not relevance. A story at the top of Hacker News announcing a new model
scores low. An obscure post on how one team restructured their code review can score
high. Judge the article in front of you, not the attention around it.

THIS READER'S INTERESTS, from a profile they filled in themselves. Treat the first list
as a strong bonus to the score and the last as a penalty; an article outside every list
is judged on the rubric alone, never blocked.

Strongest interest — they ticked every single topic in these areas:
  - Driving coding agents: running several in parallel across worktrees, splitting work
    between subagents, context engineering, writing agent instruction files and specs,
    reviewing agent-written code, self-verifying loops, agents on large/legacy codebases,
    migrations, real token cost, whether agents are measurably faster, when NOT to use one,
    building your own tools/MCP for them, comparing harnesses.
  - Working alongside AI: which skills gain or lose value, not going hollow when the agent
    writes the code, reading code more than writing it, verifying rather than generating,
    how far to trust it, how junior and senior roles shift, technical taste and judgment.
  - System architecture: when to split a monolith, API design, schema design, slow queries
    and indexes, caching, queues and background jobs, idempotency and retries, data
    consistency, designing for failure, realtime systems, local-first and offline.
  - Running things in production: observability, investigating incidents, post-mortems,
    safe deploys, performance work, what breaks at scale, infrastructure cost, on-call.
  - Career and market: hiring market data, skills in demand, pay, interviewing, the path to
    senior/staff, remote work, side projects and indie work, burnout and sustainable pace.

Also wanted, more selectively:
  - Craft: refactoring, effective code review, naming and structure, reading a large codebase.
  - Security: common vulnerabilities, secret management, securing LLM use, authn/authz.
  - AI direction: putting LLMs into real products, how AI reshapes the software industry,
    the skeptical case, prompting for real work.
  - Team: development process, technical decision-making, working with PM and design.
  - Tools: advanced git, terminal and CLI, editor setup, CI/CD, frontend, CSS, backend.
  - Fundamentals: networking, operating systems, algorithms, database internals.

Explicitly NOT of interest — score these low even when well written: model and product
release news, benchmarks and funding, estimation, documentation practice, onboarding,
compiler internals, industry history, and academic papers presented as papers.

Keep technical terms in English (deploy, cache, runtime, ...) rather than forcing
a Vietnamese translation. Return only JSON matching the schema, with no preamble.`;

/** Not every Groq model accepts json_schema, but nearly all accept json_object.
 *  Once we learn which one works, remember it for the rest of the run. */
let mode: "json_schema" | "json_object" = "json_schema";

function responseFormat(m: typeof mode) {
  return m === "json_schema"
    ? ({
        type: "json_schema",
        json_schema: { name: "article_summary", strict: true, schema: JSON_SCHEMA },
      } as const)
    : ({ type: "json_object" } as const);
}

/** The model cannot do json_schema at all — a capability fact, true for every request,
 *  so the run switches mode permanently. */
function isFormatUnsupported(err: unknown): boolean {
  if (!(err instanceof Groq.APIError) || err.status !== 400) return false;
  return /response_format|json_schema|structured output|not supported/i.test(err.message ?? "");
}

/** The model supports json_schema but this one generation failed to satisfy it. That is
 *  a per-request accident, not a capability limit — retry this article in the looser mode
 *  without condemning every later article to it. */
function isSchemaMiss(err: unknown): boolean {
  if (!(err instanceof Groq.APIError) || err.status !== 400) return false;
  return /does not match the expected schema|failed to generate/i.test(err.message ?? "");
}

async function call(m: typeof mode, userContent: string): Promise<string> {
  const res = await groq().chat.completions.create({
    model: env.GROQ_MODEL,
    max_completion_tokens: 2_000,
    // Summaries should be consistent, not creative.
    temperature: 0.3,
    // gpt-oss reasons before answering, which is wasted on summarization and was a large
    // part of why requests ran past the timeout. Only these models accept the parameter.
    ...(env.GROQ_MODEL.includes("gpt-oss") ? { reasoning_effort: "low" as const } : {}),
    response_format: responseFormat(m),
    messages: [
      // json_object mode knows nothing about the schema, so inline it in the prompt.
      {
        role: "system",
        content:
          m === "json_object"
            ? `${SYSTEM}\n\nJSON Schema:\n${JSON.stringify(JSON_SCHEMA)}`
            : SYSTEM,
      },
      { role: "user", content: userContent },
    ],
  });

  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error(`Model returned no content (finish_reason: ${res.choices[0]?.finish_reason})`);
  return text;
}

export async function summarizeArticle(input: {
  title: string;
  sourceName: string;
  url: string;
  content: string | null;
}): Promise<SummaryResult> {
  // 40k characters is roughly 10k tokens for a 2-3 sentence summary — the tail of a long
  // article changes the summary very little and costs latency on every single request.
  const body = input.content
    ? input.content.slice(0, 14_000)
    : "(content could not be extracted — summarize from the title and source alone)";

  const userContent = `Source: ${input.sourceName}\nTitle: ${input.title}\nURL: ${input.url}\n\n---\n${body}`;

  let text: string;
  try {
    text = await call(mode, userContent);
  } catch (err) {
    if (mode === "json_schema" && isFormatUnsupported(err)) {
      console.warn(
        `\n  (${env.GROQ_MODEL} does not support json_schema — falling back to json_object)`,
      );
      mode = "json_object";
      text = await call(mode, userContent);
    } else if (isSchemaMiss(err)) {
      // One-off bad generation: retry this article only, leaving `mode` alone.
      text = await call("json_object", userContent);
    } else {
      throw err;
    }
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(`Model returned malformed JSON: ${text.slice(0, 200)}`);
  }

  // Validate with Zod regardless: json_object mode guarantees nothing, and even
  // strict mode fails to keep some models inside the tag vocabulary.
  const parsed = Summary.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Result did not match schema: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }

  // Drop anything outside the vocabulary rather than failing the article over it.
  const known = new Set<string>(TAGS);
  return {
    ...parsed.data,
    tags: parsed.data.tags.filter((t) => known.has(t)),
    score: Math.max(0, Math.min(100, parsed.data.score)),
  };
}
