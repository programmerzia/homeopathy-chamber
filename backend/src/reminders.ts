import type { DB } from './db.ts';
import type { makeSender } from './sms.ts';

type Data = Record<string, unknown> & { id: string; updated_at: number; deleted?: number };
export type Reminder = { patientId: string; name: string; phone: string };

const DHAKA_OFFSET_MS = 6 * 3600 * 1000; // Asia/Dhaka is UTC+6, no DST
const SEND_AFTER_HOUR = 10;

/** Dhaka wall-clock hour, today and tomorrow (YYYY-MM-DD) for an instant. */
export function dhakaClock(now: number) {
  const d = new Date(now + DHAKA_OFFSET_MS);
  const day = (t: Date) => t.toISOString().slice(0, 10);
  return { hour: d.getUTCHours(), today: day(d), tomorrow: day(new Date(d.getTime() + 86_400_000)) };
}

/** Recency of a visit: visit date, then created_at, then updated_at. */
function visitKey(v: Data): [string, number, number] {
  return [String(v.date ?? v.visit_date ?? ''), Number(v.created_at) || 0, v.updated_at];
}
function newer(a: Data, b: Data) {
  const [x, y] = [visitKey(a), visitKey(b)];
  return x[0] !== y[0] ? x[0] > y[0] : x[1] !== y[1] ? x[1] > y[1] : x[2] > y[2];
}

/**
 * Pure selection: patients whose most recent non-deleted visit has next_visit === tomorrow,
 * who are not deleted and have a phone. Patients already reminded (by id) are skipped.
 */
export function selectReminders(visits: Data[], patients: Map<string, Data>, tomorrow: string, alreadySent = new Set<string>()): Reminder[] {
  const latest = new Map<string, Data>();
  for (const v of visits) {
    const pid = v.patient_id;
    if (v.deleted || typeof pid !== 'string') continue;
    const cur = latest.get(pid);
    if (!cur || newer(v, cur)) latest.set(pid, v);
  }
  const out: Reminder[] = [];
  for (const [pid, v] of latest) {
    if (v.next_visit !== tomorrow || alreadySent.has(pid)) continue;
    const p = patients.get(pid);
    if (!p || p.deleted || typeof p.phone !== 'string' || !p.phone.trim()) continue;
    out.push({ patientId: pid, name: String(p.name ?? '').trim(), phone: p.phone.trim() });
  }
  return out;
}

export function reminderText(name: string, chamberName: string, doctorName: string) {
  return `প্রিয় ${name}, আগামীকাল ${chamberName}-এ আপনার আবার আসার তারিখ। — ${doctorName}`;
}

/** One reminder pass (no-op before 10:00 Dhaka). Returns number of SMS attempted. */
export async function runReminders(db: DB, send: ReturnType<typeof makeSender>, now = Date.now()): Promise<number> {
  const { hour, tomorrow } = dhakaClock(now);
  if (hour < SEND_AFTER_HOUR) return 0;
  const chambers = db.prepare(
    `SELECT c.id, c.name, c.doctor_name, r.data FROM records r JOIN chambers c ON c.id = r.chamber_id
     WHERE r.tbl = 'settings' AND r.id = 'chamber' AND r.deleted = 0`,
  ).all() as { id: string; name: string; doctor_name: string | null; data: string }[];
  // Visits of patients that have at least one visit due tomorrow (all of them, so "latest" is decidable).
  const visitsQ = db.prepare(
    `SELECT data FROM records WHERE chamber_id = ?1 AND tbl = 'visits' AND deleted = 0
       AND json_extract(data, '$.patient_id') IN (
         SELECT json_extract(data, '$.patient_id') FROM records
         WHERE chamber_id = ?1 AND tbl = 'visits' AND deleted = 0 AND json_extract(data, '$.next_visit') = ?2)`,
  );
  const patientQ = db.prepare(`SELECT data FROM records WHERE chamber_id = ? AND tbl = 'patients' AND id = ?`);
  const sentQ = db.prepare(`SELECT ref FROM sms_log WHERE chamber_id = ? AND kind = 'reminder' AND day = ? AND ok = 1`);

  let attempted = 0;
  for (const ch of chambers) {
    // the app stores chamber settings nested as { id: 'chamber', data: {...} }; accept a flat row too
    const row = JSON.parse(ch.data) as Record<string, unknown>;
    const settings = (row.data && typeof row.data === 'object' ? row.data : row) as Record<string, unknown>;
    if (settings.smsReminders !== true) continue;
    const visits = visitsQ.all(ch.id, tomorrow).map((r) => JSON.parse(r.data as string) as Data);
    const patients = new Map<string, Data>();
    for (const v of visits) {
      const pid = v.patient_id;
      if (typeof pid !== 'string' || patients.has(pid)) continue;
      const row = patientQ.get(ch.id, pid) as { data: string } | undefined;
      if (row) patients.set(pid, JSON.parse(row.data));
    }
    const sent = new Set((sentQ.all(ch.id, tomorrow) as { ref: string }[]).map((r) => r.ref));
    const chamberName = String(settings.chamberName || ch.name);
    const doctorName = String(settings.doctorName || ch.doctor_name || ch.name);
    for (const r of selectReminders(visits, patients, tomorrow, sent)) {
      attempted++;
      await send({ chamberId: ch.id, kind: 'reminder', ref: r.patientId, day: tomorrow }, r.phone, reminderText(r.name, chamberName, doctorName));
    }
  }
  return attempted;
}

/** Hourly timer; each Dhaka day is processed once (sms_log dedupe also survives restarts). */
export function startReminders(db: DB, send: ReturnType<typeof makeSender>): () => void {
  let doneFor = '';
  let running = false;
  const tick = async () => {
    const { hour, today } = dhakaClock(Date.now());
    if (running || hour < SEND_AFTER_HOUR || doneFor === today) return;
    running = true;
    try {
      const n = await runReminders(db, send);
      doneFor = today;
      console.log(`[reminders] ${today}: ${n} reminder(s) sent`);
    } catch (err) {
      console.error('[reminders] run failed:', err);
    } finally {
      running = false;
    }
  };
  const first = setTimeout(tick, 10_000);
  const timer = setInterval(tick, 3600_000);
  first.unref();
  timer.unref();
  return () => { clearTimeout(first); clearInterval(timer); };
}
