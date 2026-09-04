-- Applied idempotently on every startup. No migration tool on purpose: one user,
-- one DB file, CREATE IF NOT EXISTS is enough.

CREATE TABLE IF NOT EXISTS articles (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  url             TEXT    NOT NULL,
  canonical_url   TEXT    NOT NULL UNIQUE,
  dedupe_key      TEXT    NOT NULL,
  title           TEXT    NOT NULL,
  source          TEXT    NOT NULL,
  source_name     TEXT    NOT NULL,
  discuss_url     TEXT,
  author          TEXT,
  points          INTEGER NOT NULL DEFAULT 0,
  num_comments    INTEGER NOT NULL DEFAULT 0,
  published_at    INTEGER,
  fetched_at      INTEGER NOT NULL,
  content         TEXT,
  summary         TEXT,
  tags            TEXT,
  score           INTEGER,
  status          TEXT    NOT NULL DEFAULT 'new',
  error           TEXT,
  read_at         INTEGER,
  saved           INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_status    ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_dedupe    ON articles(dedupe_key);
CREATE INDEX IF NOT EXISTS idx_articles_saved     ON articles(saved);

-- Full-text search. FTS5 ships with better-sqlite3.
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  title,
  summary,
  content,
  content='articles',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
  INSERT INTO articles_fts(rowid, title, summary, content)
  VALUES (new.id, new.title, new.summary, new.content);
END;

CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, summary, content)
  VALUES ('delete', old.id, old.title, old.summary, old.content);
END;

CREATE TRIGGER IF NOT EXISTS articles_au AFTER UPDATE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, summary, content)
  VALUES ('delete', old.id, old.title, old.summary, old.content);
  INSERT INTO articles_fts(rowid, title, summary, content)
  VALUES (new.id, new.title, new.summary, new.content);
END;
