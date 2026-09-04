import Groq from "groq-sdk";
import { z } from "zod";
import { env } from "../env.js";
import { TAGS } from "./sources.js";

// Lazy on purpose: `new Groq()` THROWS immediately when GROQ_API_KEY is missing,
// and this module is imported at the top of ingest/index.ts. Constructing it at
// module scope would take down the fetch/store steps too, which need no key.
let client: Groq | null = null;
const groq = () => (client ??= new Groq());

const Summary = z.object({
  summary: z
    .string()
    .describe("Summary of the article in Vietnamese, 2-3 sentences, focused on what is new"),
  tags: z
    .array(z.enum(TAGS))
    .describe("1-3 tags describing the main topics, chosen from the fixed list"),
  score: z
    .number()
    .describe("0-100: how worth reading this is for a working programmer"),
});

export type SummaryResult = z.infer<typeof Summary>;

// Groq (OpenAI-compatible) takes JSON Schema, not Zod directly. Zod v4 already
// emits `additionalProperties: false` and a complete `required` list, which is
// exactly what strict mode wants. Only `$schema` has to go: strict mode rejects
// keys it doesn't recognize.
const { $schema: _drop, ...JSON_SCHEMA } = z.toJSONSchema(Summary) as Record<
  string,
  unknown
>;

// Written in English, but it deliberately asks for Vietnamese summaries: the
// reader of this app is Vietnamese, so the output language is a product decision,
// not an artifact of how the prompt happens to be written.
const SYSTEM = `You are a tech-news assistant for a Vietnamese software developer.

For each article you are given:
1. Summarize IN VIETNAMESE, 2-3 sentences. Say what is actually NEW or notable —
   do not restate the headline, do not speak in generalities.
2. Assign 1-3 tags, chosen only from this list: ${TAGS.join(", ")}
3. Score 0-100 for how worth reading it is for a working programmer:
   - 80-100: changes how people work, a significant new technology, deep analysis
   - 50-79: useful, worth skimming
   - 0-49: filler, thinly veiled marketing, drama, a rehash of old news

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

/** A 400 because the model lacks json_schema support — as opposed to a real
 *  failure like 401, 429 or a 5xx, which must not be swallowed. */
function isFormatUnsupported(err: unknown): boolean {
  if (!(err instanceof Groq.APIError) || err.status !== 400) return false;
  return /response_format|json_schema|structured output/i.test(err.message ?? "");
}

async function call(m: typeof mode, userContent: string): Promise<string> {
  const res = await groq().chat.completions.create({
    model: env.GROQ_MODEL,
    max_completion_tokens: 2_000,
    // Summaries should be consistent, not creative.
    temperature: 0.3,
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
  const body = input.content
    ? input.content.slice(0, 40_000)
    : "(content could not be extracted — summarize from the title and source alone)";

  const userContent = `Source: ${input.sourceName}\nTitle: ${input.title}\nURL: ${input.url}\n\n---\n${body}`;

  let text: string;
  try {
    text = await call(mode, userContent);
  } catch (err) {
    if (mode !== "json_schema" || !isFormatUnsupported(err)) throw err;
    console.warn(
      `\n  (${env.GROQ_MODEL} does not support json_schema — falling back to json_object)`,
    );
    mode = "json_object";
    text = await call(mode, userContent);
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

  // Clamp to 0-100 in case the model returns something outside the range.
  return { ...parsed.data, score: Math.max(0, Math.min(100, parsed.data.score)) };
}
