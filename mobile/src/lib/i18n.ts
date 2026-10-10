import { prefs } from './store';

/** Pick the string for the current UI language. The whole tree re-mounts when the language changes. */
export const L = (bn: string, en: string) => (prefs.get().lang === 'en' ? en : bn);
export const isBn = () => prefs.get().lang === 'bn';

const BN = '০১২৩৪৫৬৭৮৯';
export const toBnDigits = (s: string | number) => String(s).replace(/[0-9]/g, (d) => BN[+d]);
export const toEnDigits = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
/** Digits in the UI language. */
export const n = (v: string | number, lang = prefs.get().lang) => (lang === 'bn' ? toBnDigits(v) : String(v));

/** South-Asian grouping: 86400 -> 86,400 ; 1234567 -> 12,34,567 */
export function group(v: number) {
  const neg = v < 0;
  const s = String(Math.round(Math.abs(v)));
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (neg ? '-' : '') + (rest ? rest + ',' + last3 : last3);
}
export const money = (v: number, lang = prefs.get().lang) => '৳' + n(group(v), lang);
export const count = (v: number, lang = prefs.get().lang) => n(group(v), lang);

const MONTHS_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const MONTHS_BN_SHORT = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্ট', 'অক্টো', 'নভে', 'ডিসে'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_BN = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ---------- dates: stored as local 'YYYY-MM-DD' ----------
const pad = (x: number) => String(x).padStart(2, '0');
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => iso(new Date());
export const parseIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, days: number) => {
  const d = parseIso(s);
  d.setDate(d.getDate() + days);
  return iso(d);
};
export const daysBetween = (a: string, b: string) => Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86400000);

export function monthName(m: number, lang = prefs.get().lang) {
  return lang === 'bn' ? MONTHS_BN[m] : MONTHS_EN[m];
}
/** রবিবার, ২৭ সেপ্টেম্বর */
export function dayDate(s: string, lang = prefs.get().lang) {
  const d = parseIso(s);
  return lang === 'bn'
    ? `${DAYS_BN[d.getDay()]}, ${n(pad(d.getDate()), 'bn')} ${MONTHS_BN[d.getMonth()]}`
    : `${DAYS_EN[d.getDay()]}, ${pad(d.getDate())} ${MONTHS_EN[d.getMonth()]}`;
}
/** ১২ সেপ্টেম্বর ২০২৬ */
export function longDate(s: string, lang = prefs.get().lang) {
  const d = parseIso(s);
  return `${n(pad(d.getDate()), lang)} ${monthName(d.getMonth(), lang)} ${n(d.getFullYear(), lang)}`;
}
/** ১২ সেপ্ট / আজ */
export function shortDate(s: string, lang = prefs.get().lang) {
  if (s === today()) return lang === 'bn' ? 'আজ' : 'Today';
  const d = parseIso(s);
  const m = lang === 'bn' ? MONTHS_BN_SHORT[d.getMonth()] : MONTHS_EN[d.getMonth()].slice(0, 3);
  return `${n(pad(d.getDate()), lang)} ${m}`;
}
/** ২৭/০৯/২০২৬ */
export const slashDate = (s: string, lang = prefs.get().lang) => {
  const d = parseIso(s);
  return n(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`, lang);
};

export function ago(ms: number) {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (m < 1) return L('এইমাত্র', 'just now');
  if (m < 60) return L(`${n(m)} মিনিট আগে`, `${m} min ago`);
  const h = Math.round(m / 60);
  if (h < 24) return L(`${n(h)} ঘণ্টা আগে`, `${h} h ago`);
  return L(`${n(Math.round(h / 24))} দিন আগে`, `${Math.round(h / 24)} days ago`);
}

/** Normalise a Bangladeshi mobile: 01712-340142 / +8801712340142 -> 01712340142 */
export function normPhone(s: string) {
  let d = toEnDigits(s).replace(/\D/g, '');
  if (d.startsWith('880')) d = d.slice(2);
  return d;
}
export const prettyPhone = (s: string) => (s.length === 11 ? `${s.slice(0, 5)}-${s.slice(5)}` : s);
