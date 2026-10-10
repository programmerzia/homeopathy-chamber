import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dhakaClock, runReminders, selectReminders } from '../src/reminders.ts';
import { makeSender } from '../src/sms.ts';
import { setup } from './helpers.ts';

const v = (id: string, patient_id: string, date: string, next_visit: string | null, extra = {}) =>
  ({ id, patient_id, date, next_visit, updated_at: 1, deleted: 0, ...extra });
const p = (id: string, extra = {}) => ({ id, name: `Name ${id}`, phone: '01711111111', updated_at: 1, deleted: 0, ...extra });

test('dhakaClock', () => {
  // 2026-09-28T04:30Z = 10:30 in Dhaka
  assert.deepEqual(dhakaClock(Date.UTC(2026, 8, 28, 4, 30)), { hour: 10, today: '2026-09-28', tomorrow: '2026-09-29' });
  // 2026-09-30T19:00Z = 01:00 on Oct 1 in Dhaka
  assert.deepEqual(dhakaClock(Date.UTC(2026, 8, 30, 19)), { hour: 1, today: '2026-10-01', tomorrow: '2026-10-02' });
});

test('selectReminders uses only the latest visit per patient', () => {
  const T = '2026-09-29';
  const visits = [
    v('v1', 'a', '2026-09-01', T),                               // a: latest, due -> yes
    v('v2', 'b', '2026-09-01', T), v('v3', 'b', '2026-09-20', '2026-10-15'), // b: newer visit, different date -> no
    v('v4', 'c', '2026-09-20', T), v('v5', 'c', '2026-09-25', '2026-10-01', { deleted: 1 }), // c: newer one deleted -> yes
    v('v6', 'd', '2026-09-01', T),                               // d: patient deleted -> no
    v('v7', 'e', '2026-09-01', T),                               // e: no phone -> no
    v('v8', 'f', '2026-09-01', T),                               // f: already reminded -> no
    v('v9', 'g', '2026-09-01', '2026-09-30'),                    // g: not tomorrow -> no
    v('v10', 'h', '2026-09-01', T),                              // h: patient row missing -> no
  ];
  const patients = new Map(Object.entries({
    a: p('a'), b: p('b'), c: p('c'), d: p('d', { deleted: 1 }), e: p('e', { phone: '' }), f: p('f'), g: p('g'),
  }));
  const got = selectReminders(visits, patients, T, new Set(['f']));
  assert.deepEqual(got.map((r) => r.patientId).sort(), ['a', 'c']);
  assert.deepEqual(got.find((r) => r.patientId === 'a'), { patientId: 'a', name: 'Name a', phone: '01711111111' });
});

test('runReminders sends once, respects settings and time of day', async () => {
  const { db, req, register, outbox } = setup();
  const { token } = await register('01711111111', '1234', 'Fallback Chamber');
  const now = Date.UTC(2026, 8, 28, 5); // 11:00 Dhaka
  const T = '2026-09-29';
  const sync = (changes: object) => req('POST', '/sync', { lastRev: 0, changes }, token);
  await sync({
    patients: [p('a', { name: 'করিম', phone: '01811111111' })],
    visits: [v('v1', 'a', '2026-09-20', T)],
    settings: [{ id: 'chamber', updated_at: 1, deleted: 0, smsReminders: false }],
  });
  const send = makeSender(db, { name: 'test', async send(to, text) { outbox.push({ to, text }); } });

  assert.equal(await runReminders(db, send, now), 0, 'disabled in settings');
  await sync({ settings: [{ id: 'chamber', updated_at: 2, deleted: 0, smsReminders: true, doctorName: 'ডা. রহমান' }] });
  assert.equal(await runReminders(db, send, Date.UTC(2026, 8, 28, 3)), 0, 'before 10:00 Dhaka');
  assert.equal(await runReminders(db, send, now), 1);
  assert.deepEqual(outbox, [{ to: '01811111111', text: 'প্রিয় করিম, আগামীকাল Fallback Chamber-এ আপনার আবার আসার তারিখ। — ডা. রহমান' }]);
  assert.equal(await runReminders(db, send, now + 3600_000), 0, 'deduplicated via sms_log');
});

test('POST /sms/send counts sent and failed, logs each', async () => {
  const { db, req, register, outbox } = setup();
  const { token } = await register();
  const res = await req('POST', '/sms/send', { messages: [{ to: '01911111111', text: 'hello' }, { to: 'nope', text: 'x' }] }, token);
  assert.deepEqual(await res.json(), { sent: 1, failed: 1 });
  assert.equal(outbox.length, 1);
  assert.equal((db.prepare('SELECT count(*) AS n FROM sms_log').get() as { n: number }).n, 2);
  const tooMany = Array.from({ length: 201 }, () => ({ to: '01911111111', text: 'x' }));
  assert.equal((await req('POST', '/sms/send', { messages: tooMany }, token)).status, 400);
});
