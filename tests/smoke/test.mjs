// End-to-end check of the app's data layer (real SQL, dues math, dose text, prescription) and a
// push/pull sync round-trip against the real backend. Run: node tests/smoke/run.mjs
import assert from 'node:assert/strict';
const M = new URL('../../mobile/src/lib/', import.meta.url).href;
const B = new URL('../../backend/src/', import.meta.url).href;
const db = await import(M + 'db.ts');
const { seedIfEmpty } = await import(M + 'seed.ts');
const repo = await import(M + 'repo.ts');
const draftMod = await import(M + 'draft.ts');
const dose = await import(M + 'dose.ts');
const i18n = await import(M + 'i18n.ts');
const { prefs } = await import(M + 'store.ts');
const rx = await import(M + 'rx.ts');

db.migrate(); seedIfEmpty();
console.log('medicines', repo.medicineCount(), 'diseases', repo.listDiseases().length, 'advice', repo.listAdvice().length);

// i18n
assert.equal(i18n.money(86400), '৳৮৬,৪০০');
assert.equal(i18n.group(1234567), '12,34,567');
assert.equal(i18n.normPhone('+880 1712-340142'), '01712340142');
assert.equal(i18n.toEnDigits('০১৭'), '017');

// patient + family
const a = repo.savePatient({ name: 'রহিমা বেগম', phone: '01712340142', age: 42, sex: 'f', address: '', diseases: ['মাইগ্রেন'] });
const b = repo.savePatient({ name: 'সুমাইয়া আক্তার', phone: '01712340142', age: 9, sex: 'f', address: '', diseases: ['এলার্জি'] });
assert.equal(repo.familyOf('01712340142', b).length, 1);
assert.equal(repo.getPatient(a).code, 1); assert.equal(repo.getPatient(b).code, 2);

// searches
assert.equal(repo.searchPatients('রহিমা', 'all', null).length, 1);
assert.equal(repo.searchPatients('340142', 'all', null).length, 2);
assert.equal(repo.searchPatients('২', 'all', null)[0].id, b, 'serial/code search with bengali digit');
assert.equal(repo.searchPatients('', 'all', 'এলার্জি').length, 1);
assert.deepEqual(repo.topDiseases(3).slice(0, 2).sort(), ['এলার্জি', 'মাইগ্রেন'].sort());

// queue
assert.equal(repo.addToQueue(a), 1); assert.equal(repo.addToQueue(b), 2); assert.equal(repo.addToQueue(a), 1);
assert.equal(repo.searchPatients('1', 'all', null).some(p => p.id === a), true);

// dose text
const puls = repo.searchMedicines('Pulsat', 'all', null)[0];
assert.equal(puls.name, 'Pulsatilla');
let m = dose.medFrom(puls, '200C');
assert.equal(dose.doseLine(m, 'bn'), '৪টি · সকাল ও রাতে · ৭ দিন');
assert.equal(dose.doseSub(m, 'bn'), 'খালি পেটে · মোট ৫৬টি');
assert.equal(dose.rxLine(m, 'bn'), 'সকাল ও রাতে ৪টি করে, খালি পেটে · ৭ দিন');
console.log('en:', dose.rxLine(m, 'en'));
const alf = dose.blankMed('Alfalfa Q', null, 'mother', 'Q');
console.log('mother:', dose.doseLine({ ...alf, times: 2, slots: [] }, 'bn'), '|', dose.rxLine({ ...alf, times: 2, slots: [] }, 'bn'));
const sac = { ...dose.blankMed('Sac lac', null, 'powder', 'প্লাসিবো'), hide: true };
assert.equal(dose.doseLine(sac, 'bn'), '১ পুরিয়া · রাতে · ৭ দিন');
assert.equal(dose.medTitle(sac, 3, 'bn', true), 'ওষুধ ৪');

// visit 1: fee 200 + med 100, pay later -> due 300
draftMod.startVisit(a);
draftMod.draft.set({ meds: [m, sac], med_cost: 100, pay_status: 'later', complaint: 'মাথাব্যথা' });
const v1 = draftMod.commitVisit();
let pa = repo.getPatient(a);
assert.equal(pa.due, 300); assert.equal(pa.visit_count, 1); assert.equal(pa.last_medicine, 'Pulsatilla 200C');
assert.equal(repo.todayQueue().find(q => q.patient_id === a).status, 'seen');
assert.equal(repo.getMedicine(puls.id).use_count, 1);
// medFrom now uses remembered dose
assert.equal(dose.doseSignature(dose.medFrom(repo.getMedicine(puls.id))), dose.doseSignature(m));

// visit 2: fee 200, full payment incl. prev due -> total 500, due 0
draftMod.startVisit(a);
const t = draftMod.totals(draftMod.draft.get(), repo.getPatient(a).due);
assert.deepEqual(t, { prev: 300, total: 500, paid: 500 });
draftMod.commitVisit();
assert.equal(repo.getPatient(a).due, 0);

// visit 3 partial: 200 fee, pay 50 -> due 150 ; then collect 150 -> 0
draftMod.startVisit(b);
draftMod.draft.set({ pay_status: 'partial', partial: 50, method: 'bkash' });
draftMod.commitVisit();
assert.equal(repo.getPatient(b).due, 150);
assert.equal(repo.dues().total, 150);
assert.equal(repo.searchPatients('', 'due', null).length, 1);
repo.collectPayment(b, 150, 'cash');
assert.equal(repo.getPatient(b).due, 0);

// money
repo.addExpense(1000, 'ভাড়া');
const s = repo.moneySummary(i18n.today(), i18n.today());
console.log('money', s.income, s.visits, s.expense, s.byMethod);
assert.equal(s.income, 500 + 50 + 150); assert.equal(s.visits, 3); assert.equal(s.expense, 1000);
assert.equal(repo.homeCounts().seenToday, 3);

// rx text/html
const data = { v: repo.getVisit(v1), p: repo.getPatient(a), ch: repo.getChamber(), advice: repo.listAdvice().filter(x => x.is_default), lang: 'bn' };
console.log(rx.rxText(data));
assert.ok(rx.rxHtml(data).includes('ওষুধ ২'));
assert.ok(rx.labelsHtml(data).includes('Pulsatilla 200C'));

// ---- sync round-trip against the real backend app ----
const bdb = await import(B + 'db.ts');
const { createApp } = await import(B + 'app.ts');
const sdb = bdb.openDb(':memory:');
const app = createApp(sdb, { jwtSecret: 'x'.repeat(32), dataDir: (await import('node:os')).tmpdir() + '/chamber-smoke', log: false });
globalThis.fetch = (url, init) => app.fetch(new Request(url, init));
const reg = await (await fetch('http://s/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '01811111111', pin: '1234', chamberName: 'শিফা' }) })).json();
prefs.set({ apiUrl: 'http://s', token: reg.token, lastRev: 0 });
const { syncNow, syncState } = await import(M + 'sync.ts');
await syncNow();
assert.equal(syncState.get().error, '', syncState.get().error);
assert.equal(db.scalar('SELECT COUNT(*) FROM patients WHERE dirty=1'), 0);
const rev1 = prefs.get().lastRev; console.log('pushed; rev', rev1);
// another device edits patient a on the server
const row = { ...db.db.getFirstSync('SELECT * FROM patients WHERE id=?', [a]), name: 'রহিমা খাতুন', updated_at: Date.now() + 1000, diseases: ['মাইগ্রেন', 'গ্যাস্ট্রিক'] };
for (const k of ['dirty', 'due', 'visit_count', 'last_visit', 'last_medicine', 'next_visit']) delete row[k];
const other = await (await fetch('http://s/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + reg.token }, body: JSON.stringify({ lastRev: rev1, changes: { patients: [row] } }) })).json();
await syncNow();
const pa2 = repo.getPatient(a);
assert.equal(pa2.name, 'রহিমা খাতুন'); assert.deepEqual(pa2.diseases, ['মাইগ্রেন', 'গ্যাস্ট্রিক']); assert.equal(pa2.visit_count, 2, 'derived cols recomputed');
// server stored JSON columns as objects (reminders can read them)
const stored = JSON.parse(sdb.prepare("SELECT data FROM records WHERE tbl='visits' LIMIT 1").get().data);
assert.ok(Array.isArray(stored.meds), 'meds stored as array');
console.log('\nALL SMOKE CHECKS PASSED');
