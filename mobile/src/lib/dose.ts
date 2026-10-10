import type { Form, MedItem, Medicine, Slot, Timing } from './types';
import { n } from './i18n';

type Lang = 'bn' | 'en';
const pick = (lang: Lang, bn: string, en: string) => (lang === 'bn' ? bn : en);

export const FORMS: { key: Form; bn: string; en: string; icon: string }[] = [
  { key: 'globule', bn: 'বড়ি', en: 'Globules', icon: 'globule' },
  { key: 'tablet', bn: 'ট্যাবলেট', en: 'Tablet', icon: 'tablet' },
  { key: 'drop', bn: 'ফোঁটা', en: 'Drops', icon: 'drop' },
  { key: 'mother', bn: 'মাদার Q', en: 'Mother Q', icon: 'mother' },
  { key: 'lm', bn: 'LM তরল', en: 'LM liquid', icon: 'lm' },
  { key: 'syrup', bn: 'সিরাপ', en: 'Syrup', icon: 'syrup' },
  { key: 'powder', bn: 'পুরিয়া', en: 'Powder', icon: 'powder' },
  { key: 'ointment', bn: 'মলম', en: 'Ointment', icon: 'ointment' },
];
export const formLabel = (f: Form, lang: Lang) => {
  const x = FORMS.find((x) => x.key === f)!;
  if (f === 'mother') return pick(lang, 'মাদার টিংচার', 'Mother tincture');
  return lang === 'bn' ? x.bn : x.en;
};

/** unit per form and the quantity chips offered in the dose editor */
const UNITS: Record<Form, { bn: string; en: string; opts: number[] }> = {
  globule: { bn: 'টি', en: 'globules', opts: [2, 4, 6, 8] },
  tablet: { bn: 'টি', en: 'tablets', opts: [1, 2, 3, 4] },
  drop: { bn: ' ফোঁটা', en: 'drops', opts: [2, 5, 10, 15] },
  mother: { bn: ' ফোঁটা', en: 'drops', opts: [5, 10, 15, 20] },
  lm: { bn: ' চামচ', en: 'spoon', opts: [1, 2] },
  syrup: { bn: ' চামচ', en: 'spoon', opts: [1, 2] },
  powder: { bn: ' পুরিয়া', en: 'powder', opts: [1, 2] },
  ointment: { bn: '', en: '', opts: [] },
};
export const qtyOptions = (f: Form) => UNITS[f].opts;
export function qtyText(m: Pick<MedItem, 'qty' | 'form'>, lang: Lang) {
  if (m.form === 'ointment') return pick(lang, 'আক্রান্ত স্থানে লাগাবেন', 'apply locally');
  const u = UNITS[m.form];
  return lang === 'bn' ? `${n(m.qty, 'bn')}${u.bn}` : `${m.qty} ${u.en}`;
}

export const SLOT_ORDER: Slot[] = ['morning', 'noon', 'night'];
export const slotsForTimes = (t: number): Slot[] => (t === 1 ? ['morning'] : t === 2 ? ['morning', 'night'] : t >= 3 ? [...SLOT_ORDER] : []);
const SLOT_TXT: Record<Slot, [string, string, string]> = {
  morning: ['সকাল', 'সকালে', 'morning'],
  noon: ['দুপুর', 'দুপুরে', 'noon'],
  night: ['রাত', 'রাতে', 'night'],
};
export const slotLabel = (s: Slot, lang: Lang) => pick(lang, SLOT_TXT[s][0], SLOT_TXT[s][2][0].toUpperCase() + SLOT_TXT[s][2].slice(1));

const joinBn = (xs: string[]) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' ও ' + xs[xs.length - 1]);
const joinEn = (xs: string[]) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' & ' + xs[xs.length - 1]);

/** "সকাল ও রাতে" / "দিনে ৩ বার" / "একবারই" */
export function whenText(m: MedItem, lang: Lang, locative = false) {
  if (m.times === 0) return pick(lang, 'একবারই', 'single dose');
  if (m.times === -1) return pick(lang, 'প্রয়োজনে', 'when needed');
  const slots = SLOT_ORDER.filter((s) => m.slots.includes(s));
  if (slots.length && slots.length === m.times && m.times < 3) {
    if (lang === 'en') return joinEn(slots.map((s) => SLOT_TXT[s][2]));
    const words = slots.map((s) => SLOT_TXT[s][0]);
    const joined = joinBn(words);
    // "সকাল ও রাতে", "রাতে", "সকালে"
    return words.length === 1 ? SLOT_TXT[slots[0]][locative ? 1 : 1] : joined.replace(/রাত$/, 'রাতে').replace(/দুপুর$/, 'দুপুরে').replace(/সকাল$/, 'সকালে');
  }
  return pick(lang, `দিনে ${n(m.times, 'bn')} বার`, `${m.times} times a day`);
}

export const TIMINGS: { key: Timing; bn: string; en: string }[] = [
  { key: 'empty', bn: 'খালি পেটে', en: 'empty stomach' },
  { key: 'before', bn: 'খাবারের আগে', en: 'before food' },
  { key: 'after', bn: 'খাবারের পরে', en: 'after food' },
  { key: 'bed', bn: 'ঘুমের আগে', en: 'at bedtime' },
];
export const timingText = (t: Timing, lang: Lang) => {
  const x = TIMINGS.find((x) => x.key === t);
  return x ? pick(lang, x.bn, x.en) : '';
};
export const daysText = (d: number, lang: Lang) =>
  d === 0 ? pick(lang, 'শেষ হওয়া পর্যন্ত', 'until finished') : pick(lang, `${n(d, 'bn')} দিন`, `${d} days`);

export function totalUnits(m: MedItem) {
  if (!['globule', 'tablet', 'powder'].includes(m.form) || m.times <= 0 || m.days <= 0) return null;
  return m.qty * m.times * m.days;
}

/** Visit list, line 1: "৪টি · সকাল ও রাতে · ৭ দিন" */
export function doseLine(m: MedItem, lang: Lang) {
  const qty = m.water ? `${qtyText(m, lang)} ${pick(lang, 'আধা কাপ পানিতে', 'in half cup water')}` : qtyText(m, lang);
  return [qty, whenText(m, lang), m.form === 'ointment' ? '' : daysText(m.days, lang)].filter(Boolean).join(' · ');
}
/** Visit list, line 2: "খালি পেটে · মোট ৫৬টি" */
export function doseSub(m: MedItem, lang: Lang) {
  const t = totalUnits(m);
  return [timingText(m.timing, lang), m.note ?? '', t ? pick(lang, `মোট ${n(t, 'bn')}টি`, `total ${t}`) : ''].filter(Boolean).join(' · ');
}
/** Prescription sentence: "সকালে ও রাতে ৪টি করে, খালি পেটে · ৭ দিন" */
export function rxLine(m: MedItem, lang: Lang) {
  const qty = qtyText(m, lang);
  const timing = timingText(m.timing, lang);
  let head: string;
  if (m.form === 'ointment') head = [qty, whenText(m, lang)].join(', ');
  else if (m.water)
    // "১০ ফোঁটা আধা কাপ পানিতে, দিনে ২ বার খাবারের আগে"
    head = lang === 'bn'
      ? `${qty} আধা কাপ পানিতে, ${whenText(m, lang)}${timing ? ' ' + timing : ''}`
      : `${qty} in half a cup of water, ${whenText(m, lang)}${timing ? ', ' + timing : ''}`;
  // "সকাল ও রাতে ৪টি করে, খালি পেটে"
  else head = [lang === 'bn' ? `${whenText(m, lang)} ${qty} করে` : `${qty}, ${whenText(m, lang)}`, timing].filter(Boolean).join(', ');
  if (m.note) head += `, ${m.note}`;
  return m.form === 'ointment' ? head : `${head} · ${daysText(m.days, lang)}`;
}
export const medTitle = (m: MedItem, i: number, lang: Lang, forPatient: boolean) =>
  forPatient && m.hide ? pick(lang, `ওষুধ ${n(i + 1, 'bn')}`, `Medicine ${i + 1}`) : `${m.name}${m.potency && m.potency !== 'প্লাসিবো' ? ' ' + m.potency : ''}`;

// ---- one-tap doses ("এক চাপে ডোজ") ----
export function doseSignature(m: MedItem) {
  return [m.form, m.qty, m.times, SLOT_ORDER.filter((s) => m.slots.includes(s)).join('+'), m.timing, m.days, m.water ? 'w' : ''].join('|');
}
export function applySignature(m: MedItem, sig: string): MedItem {
  const [form, qty, times, slots, timing, days, w] = sig.split('|');
  return { ...m, form: form as Form, qty: +qty, times: +times, slots: (slots ? slots.split('+') : []) as Slot[], timing: timing as Timing, days: +days, water: w === 'w' };
}
export function signatureLabel(sig: string, lang: Lang) {
  const m = applySignature(blankMed('', null, 'globule'), sig);
  if (m.times === 0) return pick(lang, '১ মাত্রা', 'single dose');
  const q = m.form === 'globule' ? pick(lang, `${n(m.qty, 'bn')} বড়ি`, `${m.qty} glob`) : qtyText(m, lang);
  return [q, pick(lang, `${n(m.times, 'bn')} বার`, `${m.times}×`), daysText(m.days, lang)].join(' · ');
}
export const DEFAULT_SIGS = ['globule|4|2|morning+night|empty|7|', 'globule|4|3|morning+noon+night|empty|7|', 'globule|4|0||empty|1|'];

export function blankMed(name: string, id: string | null, form: Form, potency = ''): MedItem {
  const base: MedItem = { key: Math.random().toString(36).slice(2), medicine_id: id, name, potency, form, qty: 4, water: false, times: 2, slots: ['morning', 'night'], timing: 'empty', days: 7, hide: false };
  if (form === 'tablet') return { ...base, qty: 2, times: 3, slots: slotsForTimes(3), timing: 'after', days: 15 };
  if (form === 'mother' || form === 'drop') return { ...base, qty: 10, water: true, timing: 'before', days: 15 };
  if (form === 'powder') return { ...base, qty: 1, times: 1, slots: ['night'], timing: '', days: 7 };
  if (form === 'ointment') return { ...base, qty: 0, times: 2, timing: '', days: 7 };
  if (form === 'syrup' || form === 'lm') return { ...base, qty: 1, times: 3, slots: slotsForTimes(3), timing: 'after' };
  return base;
}

/** Build a medicine line using the doctor's most-used dose for that remedy, if any. */
export function medFrom(m: Medicine, potency?: string): MedItem {
  const base = blankMed(m.name, m.id, m.forms[0] ?? 'globule', potency ?? m.potencies.find((p) => p === '30C') ?? m.potencies[0] ?? '');
  const top = Object.entries(m.doses).sort((a, b) => b[1] - a[1])[0];
  return top ? applySignature(base, top[0]) : base;
}
