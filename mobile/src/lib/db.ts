import * as SQLite from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';

export const db = SQLite.openDatabaseSync('chamber.db');

/** Tables that sync with the server, their JSON columns, and columns that stay on this device. */
export const TABLES = {
  patients: { json: ['diseases'], local: ['due', 'visit_count', 'last_visit', 'last_medicine', 'next_visit'] },
  visits: { json: ['diseases', 'case_notes', 'meds', 'advice'], local: [] },
  payments: { json: [], local: [] },
  expenses: { json: [], local: [] },
  medicines: { json: ['potencies', 'forms', 'doses'], local: [] },
  diseases: { json: [], local: [] },
  advice: { json: [], local: [] },
  templates: { json: ['meds', 'advice'], local: [] },
  queue: { json: [], local: [] },
  khata_photos: { json: [], local: ['uri'] },
  settings: { json: ['data'], local: [] },
} as const;
export type Table = keyof typeof TABLES;

const SYNC_COLS = `updated_at INTEGER NOT NULL DEFAULT 0, deleted INTEGER NOT NULL DEFAULT 0, dirty INTEGER NOT NULL DEFAULT 1`;

const MIGRATIONS: string[] = [
  `
  CREATE TABLE patients (id TEXT PRIMARY KEY, code INTEGER NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '',
    age INTEGER, sex TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', diseases TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL, due REAL NOT NULL DEFAULT 0, visit_count INTEGER NOT NULL DEFAULT 0,
    last_visit TEXT, last_medicine TEXT, next_visit TEXT, ${SYNC_COLS});
  CREATE INDEX patients_name ON patients(name);
  CREATE INDEX patients_phone ON patients(phone);
  CREATE INDEX patients_code ON patients(code);
  CREATE INDEX patients_last ON patients(last_visit);
  CREATE INDEX patients_next ON patients(next_visit);

  CREATE TABLE visits (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, date TEXT NOT NULL, created_at INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT '', diseases TEXT NOT NULL DEFAULT '[]', complaint TEXT NOT NULL DEFAULT '',
    case_notes TEXT NOT NULL DEFAULT '{}', meds TEXT NOT NULL DEFAULT '[]', advice TEXT NOT NULL DEFAULT '[]',
    next_visit TEXT, fee REAL NOT NULL DEFAULT 0, med_cost REAL NOT NULL DEFAULT 0, discount REAL NOT NULL DEFAULT 0,
    prev_due REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0, paid REAL NOT NULL DEFAULT 0,
    pay_status TEXT NOT NULL DEFAULT 'full', method TEXT NOT NULL DEFAULT 'cash', trx_id TEXT NOT NULL DEFAULT '',
    lang TEXT NOT NULL DEFAULT 'bn', ${SYNC_COLS});
  CREATE INDEX visits_patient ON visits(patient_id, date);
  CREATE INDEX visits_date ON visits(date);

  CREATE TABLE payments (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, amount REAL NOT NULL, method TEXT NOT NULL DEFAULT 'cash',
    trx_id TEXT NOT NULL DEFAULT '', date TEXT NOT NULL, created_at INTEGER NOT NULL, ${SYNC_COLS});
  CREATE INDEX payments_patient ON payments(patient_id);
  CREATE INDEX payments_date ON payments(date);

  CREATE TABLE expenses (id TEXT PRIMARY KEY, date TEXT NOT NULL, amount REAL NOT NULL, note TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL, ${SYNC_COLS});
  CREATE INDEX expenses_date ON expenses(date);

  CREATE TABLE medicines (id TEXT PRIMARY KEY, name TEXT NOT NULL, potencies TEXT NOT NULL DEFAULT '[]', forms TEXT NOT NULL DEFAULT '[]',
    grp TEXT NOT NULL DEFAULT '', stock TEXT NOT NULL DEFAULT '', custom INTEGER NOT NULL DEFAULT 0,
    use_count INTEGER NOT NULL DEFAULT 0, doses TEXT NOT NULL DEFAULT '{}', ${SYNC_COLS});
  CREATE INDEX medicines_name ON medicines(name COLLATE NOCASE);

  CREATE TABLE diseases (id TEXT PRIMARY KEY, name_bn TEXT NOT NULL, name_en TEXT NOT NULL DEFAULT '', custom INTEGER NOT NULL DEFAULT 0, ${SYNC_COLS});

  CREATE TABLE advice (id TEXT PRIMARY KEY, text_bn TEXT NOT NULL, text_en TEXT NOT NULL DEFAULT '', short_bn TEXT NOT NULL DEFAULT '',
    short_en TEXT NOT NULL DEFAULT '', cat TEXT NOT NULL DEFAULT 'rule', is_default INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0, ${SYNC_COLS});

  CREATE TABLE templates (id TEXT PRIMARY KEY, name TEXT NOT NULL, meds TEXT NOT NULL DEFAULT '[]', advice TEXT NOT NULL DEFAULT '[]', ${SYNC_COLS});

  CREATE TABLE queue (id TEXT PRIMARY KEY, date TEXT NOT NULL, num INTEGER NOT NULL, patient_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting', created_at INTEGER NOT NULL, ${SYNC_COLS});
  CREATE INDEX queue_date ON queue(date, num);

  CREATE TABLE khata_photos (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, year INTEGER, page INTEGER NOT NULL DEFAULT 1,
    uri TEXT NOT NULL DEFAULT '', uploaded INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, ${SYNC_COLS});
  CREATE INDEX khata_patient ON khata_photos(patient_id);

  CREATE TABLE settings (id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}', ${SYNC_COLS});
  `,
];

export function migrate() {
  db.execSync('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;');
  const { user_version } = db.getFirstSync<{ user_version: number }>('PRAGMA user_version')!;
  for (let v = user_version; v < MIGRATIONS.length; v++) {
    db.withTransactionSync(() => {
      db.execSync(MIGRATIONS[v]);
      db.execSync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}

export const uid = () => randomUUID();

// ---------- change events: screens re-query when a table they read changes ----------
type Listener = (tables: Set<Table>) => void;
const listeners = new Set<Listener>();
let pending = new Set<Table>();
let scheduled = false;
export function onChange(f: Listener) {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
}
export function notify(...tables: Table[]) {
  tables.forEach((t) => pending.add(t));
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    const t = pending;
    pending = new Set();
    scheduled = false;
    listeners.forEach((f) => f(t));
  });
}

// ---------- row (de)serialisation ----------
export function decode<T>(table: Table, row: any): T {
  if (!row) return row;
  for (const c of TABLES[table].json) if (typeof row[c] === 'string') row[c] = JSON.parse(row[c]);
  return row as T;
}
export function all<T>(table: Table, sql: string, params: SQLite.SQLiteBindParams = []): T[] {
  return db.getAllSync<any>(sql, params).map((r) => decode<T>(table, r));
}
export function one<T>(table: Table, sql: string, params: SQLite.SQLiteBindParams = []): T | null {
  return decode<T>(table, db.getFirstSync<any>(sql, params));
}
export function scalar<T = number>(sql: string, params: SQLite.SQLiteBindParams = []): T {
  const r = db.getFirstSync<any>(sql, params);
  return (r ? Object.values(r)[0] : null) as T;
}

let syncHook: () => void = () => {};
export const setSyncHook = (f: () => void) => (syncHook = f);
export const requestSync = () => syncHook();

/** Insert or update a row (partial for updates), marking it dirty for sync. */
export function save(table: Table, row: Record<string, any> & { id: string }, opts: { silent?: boolean } = {}) {
  const r: Record<string, any> = { ...row, updated_at: Date.now(), dirty: 1 };
  for (const c of TABLES[table].json) if (c in r && typeof r[c] !== 'string') r[c] = JSON.stringify(r[c]);
  const cols = Object.keys(r);
  const vals = cols.map((c) => (typeof r[c] === 'boolean' ? Number(r[c]) : r[c] ?? null));
  // partial updates must not go through INSERT (SQLite checks NOT NULL before ON CONFLICT)
  const exists = db.getFirstSync(`SELECT 1 FROM ${table} WHERE id=?`, [r.id]);
  if (exists) {
    const set = cols.filter((c) => c !== 'id');
    db.runSync(`UPDATE ${table} SET ${set.map((c) => `${c}=?`).join(',')} WHERE id=?`, [...set.map((c) => vals[cols.indexOf(c)]), r.id]);
  } else {
    db.runSync(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals);
  }
  if (!opts.silent) {
    notify(table);
    syncHook();
  }
}
export function remove(table: Table, id: string) {
  db.runSync(`UPDATE ${table} SET deleted=1, dirty=1, updated_at=? WHERE id=?`, [Date.now(), id]);
  notify(table);
  syncHook();
}
