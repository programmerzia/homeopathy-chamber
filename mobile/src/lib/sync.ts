import { AppState } from 'react-native';
import { File } from 'expo-file-system';
import { db, notify, setSyncHook, TABLES, type Table } from './db';
import { createStore, prefs } from './store';
import { recomputePatients } from './repo';

export const syncState = createStore({ running: false, error: '' as string });

export class ApiError extends Error {
  status: number;
  constructor(status: number, msg: string) {
    super(msg);
    this.status = status;
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { apiUrl, token } = prefs.get();
  if (!apiUrl) throw new ApiError(0, 'no-server');
  const headers: Record<string, string> = { ...(init.headers as any) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.json !== undefined) headers['Content-Type'] = 'application/json';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(apiUrl.replace(/\/$/, '') + path, {
      ...init,
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      signal: ctrl.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, body.error ?? res.statusText);
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

const TABLE_NAMES = Object.keys(TABLES) as Table[];
const BATCH = 500;

function collectDirty() {
  const changes: Partial<Record<Table, any[]>> = {};
  let total = 0;
  for (const t of TABLE_NAMES) {
    if (total >= BATCH) break;
    const rows = db.getAllSync<any>(`SELECT * FROM ${t} WHERE dirty=1 LIMIT ?`, [BATCH - total]);
    if (!rows.length) continue;
    const local = TABLES[t].local as readonly string[];
    const json = TABLES[t].json as readonly string[];
    changes[t] = rows.map((r) => {
      const out: any = {};
      // JSON columns go over the wire as real objects so the server (e.g. reminders) can read them
      for (const k in r) if (k !== 'dirty' && !local.includes(k)) out[k] = json.includes(k) && typeof r[k] === 'string' ? JSON.parse(r[k]) : r[k];
      return out;
    });
    total += rows.length;
  }
  return { changes, total };
}

function applyRemote(changes: Partial<Record<Table, any[]>>) {
  const touchedPatients = new Set<string>();
  const touched: Table[] = [];
  db.withTransactionSync(() => {
    for (const t of Object.keys(changes) as Table[]) {
      if (!(t in TABLES)) continue;
      const cols = new Set(db.getAllSync<{ name: string }>(`PRAGMA table_info(${t})`).map((c) => c.name));
      for (const row of changes[t]!) {
        const cur = db.getFirstSync<{ updated_at: number; dirty: number }>(`SELECT updated_at, dirty FROM ${t} WHERE id=?`, [row.id]);
        if (cur && cur.updated_at >= row.updated_at) continue; // our copy is newer (or same)
        const keys = Object.keys(row).filter((k) => cols.has(k) && k !== 'dirty');
        const vals = keys.map((k) => (row[k] !== null && typeof row[k] === 'object' ? JSON.stringify(row[k]) : row[k]));
        db.runSync(
          `INSERT INTO ${t} (${keys.join(',')},dirty) VALUES (${keys.map(() => '?').join(',')},0)
           ON CONFLICT(id) DO UPDATE SET ${keys.filter((k) => k !== 'id').map((k) => `${k}=excluded.${k}`).join(',')}, dirty=0`,
          vals,
        );
        if (t === 'patients') touchedPatients.add(row.id);
        if (['visits', 'payments'].includes(t) && row.patient_id) touchedPatients.add(row.patient_id);
      }
      touched.push(t);
    }
  });
  if (touchedPatients.size) recomputePatients([...touchedPatients]);
  if (touched.length) notify(...touched);
}

async function uploadPhotos() {
  const rows = db.getAllSync<{ id: string; uri: string }>(`SELECT id, uri FROM khata_photos WHERE uploaded=0 AND deleted=0 AND uri<>'' LIMIT 20`);
  for (const r of rows) {
    const file = new File(r.uri);
    if (!file.exists) continue;
    await api(`/photos/${r.id}`, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: (await file.bytes()) as any });
    // mark uploaded without making it dirty again (the row itself is synced separately)
    db.runSync(`UPDATE khata_photos SET uploaded=1 WHERE id=?`, [r.id]);
  }
}

let inflight: Promise<void> | null = null;
export function syncNow(): Promise<void> {
  if (!prefs.get().token) return Promise.resolve();
  if (inflight) return inflight;
  inflight = (async () => {
    syncState.set({ running: true, error: '' });
    try {
      for (let guard = 0; guard < 50; guard++) {
        const { changes, total } = collectDirty();
        const res = await api<{ rev: number; changes: Partial<Record<Table, any[]>>; more?: boolean }>('/sync', {
          method: 'POST',
          json: { lastRev: prefs.get().lastRev, changes },
        });
        // clear dirty only for rows that did not change while the request was in flight
        db.withTransactionSync(() => {
          for (const t of Object.keys(changes) as Table[])
            for (const r of changes[t]!) db.runSync(`UPDATE ${t} SET dirty=0 WHERE id=? AND updated_at=?`, [r.id, r.updated_at]);
        });
        applyRemote(res.changes);
        prefs.set({ lastRev: res.rev });
        if (!res.more && total < BATCH) break;
      }
      await uploadPhotos();
      prefs.set({ lastBackupAt: Date.now() });
      syncState.set({ running: false });
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) prefs.set({ token: '' });
      syncState.set({ running: false, error: e?.message ?? 'sync failed' });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

let debounce: ReturnType<typeof setTimeout> | undefined;
export function startSync() {
  setSyncHook(() => {
    clearTimeout(debounce);
    debounce = setTimeout(syncNow, 4000);
  });
  syncNow();
  const every = setInterval(syncNow, 5 * 60 * 1000);
  const sub = AppState.addEventListener('change', (s) => s === 'active' && syncNow());
  return () => {
    clearInterval(every);
    sub.remove();
  };
}
