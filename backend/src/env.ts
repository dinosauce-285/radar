import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// This file always sits exactly one level below backend/ (backend/src/env.ts in
// dev, backend/dist/env.js in prod), so ROOT resolves identically in both.
const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, "..", "..");

dotenv.config({ path: path.join(ROOT, ".env"), quiet: true });

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const DATA_DIR = path.isAbsolute(process.env.DATA_DIR ?? "")
  ? process.env.DATA_DIR!
  : path.join(ROOT, process.env.DATA_DIR ?? "data");

fs.mkdirSync(DATA_DIR, { recursive: true });

export const env = {
  ROOT,
  DATA_DIR,
  DB_PATH: path.join(DATA_DIR, "radar.db"),
  PORT: num("PORT", 3000),
  GROQ_MODEL: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  MAX_SUMMARIZE_PER_RUN: num("MAX_SUMMARIZE_PER_RUN", 40),
  SUMMARIZE_CONCURRENCY: num("SUMMARIZE_CONCURRENCY", 4),
  hasApiKey: Boolean(process.env.GROQ_API_KEY),
  FRONTEND_DIST: path.join(ROOT, "frontend", "dist"),
};
