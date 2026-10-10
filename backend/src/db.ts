import { DatabaseSync } from 'node:sqlite';

export type DB = DatabaseSync;

// Append-only. Each entry bumps PRAGMA user_version by one.
const MIGRATIONS = [
  `CREATE TABLE chambers (
     id          TEXT PRIMARY KEY,
     phone       TEXT NOT NULL UNIQUE,
     pin_hash    TEXT NOT NULL,
     name        TEXT NOT NULL,
     doctor_name TEXT,
     rev         INTEGER NOT NULL DEFAULT 0,
     created_at  INTEGER NOT NULL
   );
   CREATE TABLE records (
     chamber_id TEXT NOT NULL REFERENCES chambers(id) ON DELETE CASCADE,
     tbl        TEXT NOT NULL,
     id         TEXT NOT NULL,
     updated_at INTEGER NOT NULL,
     deleted    INTEGER NOT NULL DEFAULT 0,
     rev        INTEGER NOT NULL,
     data       TEXT NOT NULL,
     PRIMARY KEY (chamber_id, tbl, id)
   );
   CREATE INDEX records_rev ON records (chamber_id, rev);
   CREATE TABLE sms_log (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     chamber_id TEXT NOT NULL REFERENCES chambers(id) ON DELETE CASCADE,
     kind       TEXT NOT NULL,          -- 'manual' | 'reminder'
     ref        TEXT,                   -- reminder: patient id
     day        TEXT,                   -- reminder: target date YYYY-MM-DD
     to_phone   TEXT NOT NULL,
     text       TEXT NOT NULL,
     ok         INTEGER NOT NULL,
     error      TEXT,
     created_at INTEGER NOT NULL
   );
   CREATE INDEX sms_log_dedupe ON sms_log (chamber_id, kind, ref, day);`,
];

export function openDb(path: string): DB {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;');
  const { user_version } = db.prepare('PRAGMA user_version').get() as { user_version: number };
  for (let v = user_version; v < MIGRATIONS.length; v++) {
    tx(db, () => {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
    });
  }
  return db;
}

/** Run fn inside a write transaction (synchronous; node:sqlite is sync). */
export function tx<T>(db: DB, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
