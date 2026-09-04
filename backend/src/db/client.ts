import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { env } from "../env.js";
import * as schema from "./schema.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export const sqlite = new Database(env.DB_PATH);

// WAL lets the ingest worker write while the server is still reading.
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");

// Applied on every startup. Idempotent, so it is safe to run repeatedly.
sqlite.exec(fs.readFileSync(path.join(here, "schema.sql"), "utf8"));

export const db = drizzle(sqlite, { schema });
export { schema };
