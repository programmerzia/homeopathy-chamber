import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { tx, type DB } from './db.ts';
import { parseJson, type AppEnv } from './http.ts';

export const SYNC_TABLES = [
  'patients', 'visits', 'payments', 'expenses', 'medicines', 'diseases',
  'advice', 'templates', 'queue', 'khata_photos', 'settings',
] as const;
const TABLE_SET = new Set<string>(SYNC_TABLES);
export const PAGE_SIZE = 5000;

const Row = z.looseObject({
  id: z.string().min(1).max(64),
  updated_at: z.number().int().nonnegative(),
  deleted: z.union([z.literal(0), z.literal(1)]),
});
type Row = z.infer<typeof Row>;

const SyncBody = z.object({
  lastRev: z.number().int().nonnegative(),
  changes: z.record(z.string(), z.array(Row)).default({}),
});

export function syncRoutes(db: DB) {
  const getRev = db.prepare('SELECT rev FROM chambers WHERE id = ?');
  const setRev = db.prepare('UPDATE chambers SET rev = ? WHERE id = ?');
  const existing = db.prepare('SELECT updated_at FROM records WHERE chamber_id = ? AND tbl = ? AND id = ?');
  const upsert = db.prepare(
    `INSERT INTO records (chamber_id, tbl, id, updated_at, deleted, rev, data) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (chamber_id, tbl, id) DO UPDATE SET
       updated_at = excluded.updated_at, deleted = excluded.deleted, rev = excluded.rev, data = excluded.data`,
  );
  const since = db.prepare(
    'SELECT tbl, rev, data FROM records WHERE chamber_id = ? AND rev > ? AND rev <= ? ORDER BY rev LIMIT ?',
  );

  return new Hono<AppEnv>().post('/', async (c) => {
    const body = await parseJson(c, SyncBody);
    const bad = Object.keys(body.changes).find((t) => !TABLE_SET.has(t));
    if (bad) throw new HTTPException(400, { message: `unknown table: ${bad}` });
    const chamberId = c.var.chamberId;

    const result = tx(db, () => {
      // Every write in this request gets rev > startRev, and every row with rev <= startRev
      // predates it, so "changes since lastRev excluding our own writes" is (lastRev, startRev].
      const startRev = (getRev.get(chamberId) as { rev: number }).rev;
      let rev = startRev;
      for (const [tbl, rows] of Object.entries(body.changes)) {
        for (const row of rows as Row[]) {
          const cur = existing.get(chamberId, tbl, row.id) as { updated_at: number } | undefined;
          if (cur && row.updated_at <= cur.updated_at) continue; // last-write-wins, ties keep server copy
          upsert.run(chamberId, tbl, row.id, row.updated_at, row.deleted, ++rev, JSON.stringify(row));
        }
      }
      if (rev !== startRev) setRev.run(rev, chamberId);

      const rows = since.all(chamberId, body.lastRev, startRev, PAGE_SIZE + 1) as { tbl: string; rev: number; data: string }[];
      const more = rows.length > PAGE_SIZE;
      if (more) rows.length = PAGE_SIZE;
      const changes: Record<string, unknown[]> = {};
      for (const r of rows) (changes[r.tbl] ??= []).push(JSON.parse(r.data));
      return more ? { rev: rows[rows.length - 1].rev, changes, more: true } : { rev, changes };
    });

    return c.json({ ...result, serverTime: Date.now() });
  });
}
