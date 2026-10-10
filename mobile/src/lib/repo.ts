import { all, db, notify, one, requestSync, save, scalar, uid } from './db';
import { today, toEnDigits } from './i18n';
import type {
  Advice, ChamberSettings, Disease, Expense, KhataPhoto, MedItem, Medicine, Method, Patient, Payment, QueueItem, Template, Visit,
} from './types';
import { doseSignature } from './dose';

const LIVE = 'deleted=0';

// ---------------- settings ----------------
export const DEFAULT_CHAMBER: ChamberSettings = {
  chamberName: '', doctorName: '', degree: 'DHMS', regNo: '', address: '', phone: '', fee: 200,
  bkash: '', nagad: '', rocket: '', smsReminders: true,
};
export function getChamber(): ChamberSettings {
  const r = one<{ data: ChamberSettings }>('settings', `SELECT data FROM settings WHERE id='chamber'`);
  return { ...DEFAULT_CHAMBER, ...(r?.data ?? {}) };
}
export function saveChamber(patch: Partial<ChamberSettings>) {
  save('settings', { id: 'chamber', data: { ...getChamber(), ...patch } });
}

// ---------------- patients ----------------
export function getPatient(id: string) {
  return one<Patient>('patients', `SELECT * FROM patients WHERE id=?`, [id]);
}
export function nextPatientCode() {
  return (scalar<number>(`SELECT MAX(code) FROM patients`) ?? 0) + 1;
}
export function familyOf(phone: string, exceptId?: string) {
  if (phone.length < 11) return [];
  return all<Patient>('patients', `SELECT id,name FROM patients WHERE ${LIVE} AND phone=? AND id<>?`, [phone, exceptId ?? '']);
}
export function savePatient(p: Partial<Patient> & { name: string }) {
  const id = p.id ?? uid();
  const { due, visit_count, last_visit, last_medicine, next_visit, ...syncable } = p as Patient;
  save('patients', { ...syncable, id, ...(p.id ? {} : { code: nextPatientCode(), created_at: Date.now() }) });
  return id;
}

export type PatientFilter = 'all' | 'today' | 'overdue' | 'due';
export function searchPatients(q: string, filter: PatientFilter, disease: string | null, limit = 300): Patient[] {
  const where: string[] = [LIVE];
  const args: any[] = [];
  const query = toEnDigits(q.trim());
  if (query) {
    const digits = query.replace(/\D/g, '');
    const parts = ['name LIKE ?', 'diseases LIKE ?'];
    args.push(`%${query}%`, `%${query}%`);
    if (digits.length >= 3) {
      parts.push('phone LIKE ?');
      args.push(`%${digits}%`);
    }
    if (digits && digits === query) {
      parts.push('code = ?', `id IN (SELECT patient_id FROM queue WHERE ${LIVE} AND date=? AND num=?)`);
      args.push(+digits, today(), +digits);
    }
    where.push(`(${parts.join(' OR ')})`);
  }
  const t = today();
  if (filter === 'today') {
    where.push(`(next_visit=? OR last_visit=? OR id IN (SELECT patient_id FROM queue WHERE ${LIVE} AND date=?))`);
    args.push(t, t, t);
  } else if (filter === 'overdue') {
    where.push(`next_visit < ? AND (last_visit IS NULL OR last_visit < next_visit)`);
    args.push(t);
  } else if (filter === 'due') where.push('due > 0');
  if (disease) {
    where.push(`EXISTS (SELECT 1 FROM json_each(patients.diseases) WHERE value=?)`);
    args.push(disease);
  }
  const order = filter === 'due' ? 'due DESC' : filter === 'overdue' ? 'next_visit DESC' : `COALESCE(last_visit, date(created_at/1000,'unixepoch','localtime')) DESC, name`;
  return all<Patient>('patients', `SELECT * FROM patients WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ${limit}`, args);
}
export const patientCount = () => scalar<number>(`SELECT COUNT(*) FROM patients WHERE ${LIVE}`);

export function topDiseases(limit = 8): string[] {
  const rows = db.getAllSync<{ value: string }>(
    `SELECT j.value AS value, COUNT(*) c FROM patients, json_each(patients.diseases) j WHERE patients.deleted=0 GROUP BY j.value ORDER BY c DESC LIMIT ?`,
    [limit],
  );
  const names = rows.map((r) => r.value);
  if (names.length < limit)
    for (const d of listDiseases()) if (!names.includes(d.name_bn) && names.length < limit) names.push(d.name_bn);
  return names;
}

/** Recalculate the derived columns (due, last visit, …) of patients. Runs after local saves and after sync pulls. */
export function recomputePatients(ids?: string[]) {
  const scope = ids ? `WHERE id IN (${ids.map(() => '?').join(',')})` : '';
  db.runSync(
    `UPDATE patients SET
      due = COALESCE((SELECT SUM(fee + med_cost - discount - paid) FROM visits v WHERE v.patient_id=patients.id AND v.deleted=0),0)
          - COALESCE((SELECT SUM(amount) FROM payments p WHERE p.patient_id=patients.id AND p.deleted=0),0),
      visit_count = (SELECT COUNT(*) FROM visits v WHERE v.patient_id=patients.id AND v.deleted=0),
      last_visit = (SELECT MAX(date) FROM visits v WHERE v.patient_id=patients.id AND v.deleted=0),
      next_visit = (SELECT next_visit FROM visits v WHERE v.patient_id=patients.id AND v.deleted=0 ORDER BY date DESC, created_at DESC LIMIT 1),
      last_medicine = (SELECT json_extract(meds,'$[0].name') || ' ' || json_extract(meds,'$[0].potency') FROM visits v
                       WHERE v.patient_id=patients.id AND v.deleted=0 AND json_array_length(meds)>0 ORDER BY date DESC, created_at DESC LIMIT 1)
     ${scope}`,
    ids ?? [],
  );
  notify('patients');
}

// ---------------- visits ----------------
export const getVisit = (id: string) => one<Visit>('visits', `SELECT * FROM visits WHERE id=?`, [id]);
export const patientVisits = (pid: string) =>
  all<Visit>('visits', `SELECT * FROM visits WHERE ${LIVE} AND patient_id=? ORDER BY date DESC, created_at DESC`, [pid]);
export const lastVisit = (pid: string) =>
  one<Visit>('visits', `SELECT * FROM visits WHERE ${LIVE} AND patient_id=? ORDER BY date DESC, created_at DESC LIMIT 1`, [pid]);
export const recentVisits = (limit = 100) =>
  all<Visit & { name: string; code: number }>(
    'visits',
    `SELECT v.*, p.name, p.code FROM visits v JOIN patients p ON p.id=v.patient_id WHERE v.deleted=0 ORDER BY v.date DESC, v.created_at DESC LIMIT ?`,
    [limit],
  );

export function saveVisit(v: Visit) {
  db.withTransactionSync(() => {
    save('visits', v, { silent: true });
    // remember how this doctor doses each medicine -> one-tap doses next time
    for (const m of v.meds) {
      if (!m.medicine_id) continue;
      const med = getMedicine(m.medicine_id);
      if (!med) continue;
      const sig = doseSignature(m);
      save('medicines', { id: med.id, use_count: med.use_count + 1, doses: { ...med.doses, [sig]: (med.doses[sig] ?? 0) + 1 } }, { silent: true });
    }
    const q = one<QueueItem>('queue', `SELECT * FROM queue WHERE ${LIVE} AND date=? AND patient_id=? AND status='waiting'`, [v.date, v.patient_id]);
    if (q) save('queue', { id: q.id, status: 'seen' }, { silent: true });
    const p = getPatient(v.patient_id);
    if (p) {
      const merged = Array.from(new Set([...p.diseases, ...v.diseases]));
      if (merged.length !== p.diseases.length) save('patients', { id: p.id, diseases: merged }, { silent: true });
    }
  });
  recomputePatients([v.patient_id]);
  notify('visits', 'medicines', 'queue');
  requestSync();
}

// ---------------- payments / expenses ----------------
export function collectPayment(pid: string, amount: number, method: Method, trx_id = '') {
  save('payments', { id: uid(), patient_id: pid, amount, method, trx_id, date: today(), created_at: Date.now() });
  recomputePatients([pid]);
}
export function addExpense(amount: number, note: string, date = today()) {
  save('expenses', { id: uid(), amount, note, date, created_at: Date.now() });
}
export const patientPayments = (pid: string) =>
  all<Payment>('payments', `SELECT * FROM payments WHERE ${LIVE} AND patient_id=? ORDER BY created_at DESC`, [pid]);

export function moneySummary(from: string, to: string) {
  const byMethod = db.getAllSync<{ method: Method; amt: number }>(
    `SELECT method, SUM(amt) amt FROM (
       SELECT method, paid amt FROM visits WHERE ${LIVE} AND date BETWEEN ? AND ?
       UNION ALL SELECT method, amount FROM payments WHERE ${LIVE} AND date BETWEEN ? AND ?)
     GROUP BY method`,
    [from, to, from, to],
  );
  const income = byMethod.reduce((s, r) => s + r.amt, 0);
  const visits = scalar<number>(`SELECT COUNT(*) FROM visits WHERE ${LIVE} AND date BETWEEN ? AND ?`, [from, to]);
  const expense = scalar<number>(`SELECT COALESCE(SUM(amount),0) FROM expenses WHERE ${LIVE} AND date BETWEEN ? AND ?`, [from, to]);
  const expenses = all<Expense>('expenses', `SELECT * FROM expenses WHERE ${LIVE} AND date BETWEEN ? AND ? ORDER BY date DESC`, [from, to]);
  return { byMethod, income, visits, expense, expenses };
}
export function dues() {
  const list = all<Patient>('patients', `SELECT id,name,phone,due FROM patients WHERE ${LIVE} AND due > 0 ORDER BY due DESC`);
  return { list, total: list.reduce((s, p) => s + p.due, 0) };
}

// ---------------- queue (serial) ----------------
export const todayQueue = () =>
  all<QueueItem & { name: string; visit_count: number; diseases: string; last_medicine: string | null }>(
    'queue',
    `SELECT q.*, p.name, p.visit_count, p.diseases, p.last_medicine FROM queue q JOIN patients p ON p.id=q.patient_id
     WHERE q.deleted=0 AND q.date=? ORDER BY q.num`,
    [today()],
  );
export function addToQueue(pid: string) {
  const t = today();
  const existing = one<QueueItem>('queue', `SELECT * FROM queue WHERE ${LIVE} AND date=? AND patient_id=? AND status='waiting'`, [t, pid]);
  if (existing) return existing.num;
  const num = (scalar<number>(`SELECT MAX(num) FROM queue WHERE ${LIVE} AND date=?`, [t]) ?? 0) + 1;
  save('queue', { id: uid(), date: t, num, patient_id: pid, status: 'waiting', created_at: Date.now() });
  return num;
}
export const setQueueStatus = (id: string, status: QueueItem['status']) => save('queue', { id, status });

// ---------------- catalogues ----------------
export const getMedicine = (id: string) => one<Medicine>('medicines', `SELECT * FROM medicines WHERE id=?`, [id]);
export function searchMedicines(q: string, tab: 'all' | 'stock' | 'used', form: string | null, limit = 400) {
  const where = [LIVE];
  const args: any[] = [];
  if (q.trim()) {
    where.push('name LIKE ?');
    args.push(`%${q.trim()}%`);
  }
  if (tab === 'stock') where.push(`stock IN ('in','low')`);
  if (tab === 'used') where.push('use_count > 0');
  if (form) {
    where.push(`EXISTS (SELECT 1 FROM json_each(medicines.forms) WHERE value IN (${form.split(',').map(() => '?').join(',')}))`);
    args.push(...form.split(','));
  }
  const order = tab === 'used' ? 'use_count DESC, name' : q.trim() ? `CASE WHEN name LIKE ? THEN 0 ELSE 1 END, use_count DESC, name` : 'name COLLATE NOCASE';
  if (q.trim() && tab !== 'used') args.push(`${q.trim()}%`);
  return all<Medicine>('medicines', `SELECT * FROM medicines WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ${limit}`, args);
}
export const medicineCount = () => scalar<number>(`SELECT COUNT(*) FROM medicines WHERE ${LIVE}`);
export const lowStock = () => all<Medicine>('medicines', `SELECT * FROM medicines WHERE ${LIVE} AND stock='low' ORDER BY name`);
export const frequentMedicines = (limit = 6) =>
  all<Medicine>('medicines', `SELECT * FROM medicines WHERE ${LIVE} AND use_count>0 ORDER BY use_count DESC LIMIT ?`, [limit]);
export function saveMedicine(m: Partial<Medicine> & { name: string }) {
  const id = m.id ?? uid();
  save('medicines', { potencies: [], forms: ['globule'], doses: {}, use_count: 0, grp: '', stock: '', ...m, id, ...(m.id ? {} : { custom: 1 }) });
  return id;
}

export const listDiseases = () => all<Disease>('diseases', `SELECT * FROM diseases WHERE ${LIVE} ORDER BY custom DESC, name_bn`);
export function addDisease(name_bn: string, name_en = '') {
  const id = uid();
  save('diseases', { id, name_bn, name_en, custom: 1 });
  return id;
}

export const listAdvice = () => all<Advice>('advice', `SELECT * FROM advice WHERE ${LIVE} ORDER BY sort, rowid`);
export function addAdvice(text: string, isDefault: boolean) {
  const id = uid();
  save('advice', { id, text_bn: text, text_en: text, short_bn: text, short_en: text, cat: 'mine', is_default: isDefault ? 1 : 0, sort: 1000 });
  return id;
}

export const listTemplates = () => all<Template>('templates', `SELECT * FROM templates WHERE ${LIVE} ORDER BY name`);
export const saveTemplate = (name: string, meds: MedItem[], advice: string[]) => save('templates', { id: uid(), name, meds, advice });

// ---------------- khata photos ----------------
export const patientPhotos = (pid: string) =>
  all<KhataPhoto>('khata_photos', `SELECT * FROM khata_photos WHERE ${LIVE} AND patient_id=? ORDER BY year, page, created_at`, [pid]);
export const allPhotos = () =>
  all<KhataPhoto & { name: string }>(
    'khata_photos',
    `SELECT k.*, p.name FROM khata_photos k JOIN patients p ON p.id=k.patient_id WHERE k.deleted=0 ORDER BY k.created_at DESC`,
  );
export function addPhoto(pid: string, year: number | null, uri: string, id = uid()) {
  const page = (scalar<number>(`SELECT MAX(page) FROM khata_photos WHERE ${LIVE} AND patient_id=? AND year IS ?`, [pid, year]) ?? 0) + 1;
  save('khata_photos', { id, patient_id: pid, year, page, uri, uploaded: 0, created_at: Date.now() });
  return id;
}

// ---------------- home counters ----------------
export function homeCounts() {
  const t = today();
  return {
    followups: scalar<number>(`SELECT COUNT(*) FROM patients WHERE ${LIVE} AND next_visit=?`, [t]),
    dues: scalar<number>(`SELECT COUNT(*) FROM patients WHERE ${LIVE} AND due>0`),
    lowStock: scalar<number>(`SELECT COUNT(*) FROM medicines WHERE ${LIVE} AND stock='low'`),
    seenToday: scalar<number>(`SELECT COUNT(*) FROM visits WHERE ${LIVE} AND date=?`, [t]),
  };
}
