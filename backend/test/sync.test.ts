import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PAGE_SIZE } from '../src/sync.ts';
import { setup } from './helpers.ts';

type SyncRes = { rev: number; changes: Record<string, any[]>; serverTime: number; more?: boolean };

async function ctx() {
  const s = setup();
  const { token } = await s.register();
  const sync = async (lastRev: number, changes: Record<string, unknown[]> = {}, t = token) => {
    const res = await s.req('POST', '/sync', { lastRev, changes }, t);
    assert.equal(res.status, 200, await res.clone().text());
    return (await res.json()) as SyncRes;
  };
  return { ...s, token, sync };
}

test('pushes are stored, revs increase, own writes are not echoed', async () => {
  const { sync } = await ctx();
  const p1 = { id: 'p1', updated_at: 100, deleted: 0, name: 'রহিম', phone: '01711111111' };
  const r1 = await sync(0, { patients: [p1, { id: 'p2', updated_at: 100, deleted: 0 }] });
  assert.equal(r1.rev, 2);
  assert.deepEqual(r1.changes, {});
  assert.ok(r1.serverTime > 0);

  // Another device pulls from scratch and gets the full opaque rows.
  const r2 = await sync(0);
  assert.equal(r2.rev, 2);
  assert.deepEqual(r2.changes.patients.find((r) => r.id === 'p1'), p1);
  assert.equal(r2.changes.patients.length, 2);

  // Pull since rev 1 returns only p2.
  assert.deepEqual((await sync(1)).changes.patients.map((r) => r.id), ['p2']);

  // A client pushing while behind gets others' changes but not its own.
  const r3 = await sync(1, { visits: [{ id: 'v1', updated_at: 5, deleted: 0 }] });
  assert.equal(r3.rev, 3);
  assert.deepEqual(Object.keys(r3.changes), ['patients']);
  assert.deepEqual(r3.changes.patients.map((r) => r.id), ['p2']);
});

test('last-write-wins; ties keep the server copy', async () => {
  const { sync } = await ctx();
  await sync(0, { patients: [{ id: 'p1', updated_at: 200, deleted: 0, name: 'new' }] });

  // Older write is rejected; client (lastRev 0) gets the newer server copy back.
  const stale = await sync(0, { patients: [{ id: 'p1', updated_at: 100, deleted: 0, name: 'old' }] });
  assert.equal(stale.rev, 1);
  assert.equal(stale.changes.patients[0].name, 'new');

  // Tie is rejected too.
  const tie = await sync(1, { patients: [{ id: 'p1', updated_at: 200, deleted: 0, name: 'tie' }] });
  assert.equal(tie.rev, 1);
  assert.deepEqual(tie.changes, {});
  assert.equal((await sync(0)).changes.patients[0].name, 'new');

  // Newer write wins, including deletes (tombstones are synced).
  const del = await sync(1, { patients: [{ id: 'p1', updated_at: 300, deleted: 1, name: 'new' }] });
  assert.equal(del.rev, 2);
  const all = await sync(0);
  assert.deepEqual(all.changes.patients, [{ id: 'p1', updated_at: 300, deleted: 1, name: 'new' }]);
});

test('rejects unknown tables and malformed rows', async () => {
  const { req, token } = await ctx();
  const bad = async (body: unknown) => (await req('POST', '/sync', body, token)).status;
  assert.equal(await bad({ lastRev: 0, changes: { users: [] } }), 400);
  assert.equal(await bad({ lastRev: 0, changes: { patients: [{ id: 'x', updated_at: 1 }] } }), 400);
  assert.equal(await bad({ lastRev: 0, changes: { patients: [{ id: 'x'.repeat(65), updated_at: 1, deleted: 0 }] } }), 400);
  assert.equal(await bad({ changes: {} }), 400);
  assert.equal((await req('POST', '/sync', { lastRev: 0, changes: {} })).status, 401);
});

test('chambers are isolated', async () => {
  const { sync, register } = await ctx();
  await sync(0, { patients: [{ id: 'p1', updated_at: 1, deleted: 0 }] });
  const other = await register('01999999999');
  const r = await sync(0, { patients: [{ id: 'p1', updated_at: 1, deleted: 0, mine: true }] }, other.token);
  assert.equal(r.rev, 1);
  assert.deepEqual(r.changes, {});
  assert.equal((await sync(0, {}, other.token)).changes.patients[0].mine, true);
});

test('responses are paginated with more + rev cursor', async () => {
  const { sync } = await ctx();
  const total = PAGE_SIZE + 50;
  const rows = Array.from({ length: total }, (_, i) => ({ id: `m${i}`, updated_at: 1, deleted: 0 }));
  await sync(0, { medicines: rows });

  const page1 = await sync(0);
  assert.equal(page1.more, true);
  assert.equal(page1.changes.medicines.length, PAGE_SIZE);
  assert.equal(page1.rev, PAGE_SIZE);

  const page2 = await sync(page1.rev);
  assert.equal(page2.more, undefined);
  assert.equal(page2.changes.medicines.length, 50);
  assert.equal(page2.rev, total);
  const ids = new Set([...page1.changes.medicines, ...page2.changes.medicines].map((r) => r.id));
  assert.equal(ids.size, total);
});
