import { dayDate, money, n, slashDate } from './i18n';
import { formLabel, medTitle, rxLine } from './dose';
import { methodLabel, code4 } from './labels';
import type { Advice, ChamberSettings, Patient, Visit } from './types';

type Lang = 'bn' | 'en';
const t = (lang: Lang, bn: string, en: string) => (lang === 'bn' ? bn : en);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export type RxData = { v: Visit; p: Patient; ch: ChamberSettings; advice: Advice[]; lang: Lang };

export const adviceText = (a: Advice, lang: Lang) => (lang === 'bn' ? a.text_bn : a.text_en || a.text_bn);
export function payText({ v, lang }: Pick<RxData, 'v' | 'lang'>) {
  if (v.pay_status === 'later') return `${money(v.total, lang)} · ${t(lang, 'বাকি', 'due')}`;
  const st = v.pay_status === 'full' ? t(lang, 'পরিশোধ', 'paid') : t(lang, `${money(v.paid, lang)} দিয়েছেন`, `${money(v.paid, lang)} paid`);
  return `${money(v.total, lang)} · ${methodLabel(v.method, lang)} · ${st}`;
}
export const doctorLine = (ch: ChamberSettings, lang: Lang) =>
  [ch.doctorName ? `${t(lang, 'ডা.', 'Dr.')} ${ch.doctorName}${ch.degree ? `, ${ch.degree}` : ''}` : '', ch.regNo ? `${t(lang, 'রেজি. নং', 'Reg. no.')} ${ch.regNo}` : '']
    .filter(Boolean)
    .join(' · ');

/** Plain text for SMS / WhatsApp. Hidden medicines show as "ওষুধ ১". */
export function rxText({ v, p, ch, advice, lang }: RxData) {
  const lines = [
    ch.chamberName || t(lang, 'চেম্বার', 'Chamber'),
    `${p.name} · ${slashDate(v.date, lang)}`,
    '',
    ...v.meds.map((m, i) => `${n(i + 1, lang)}. ${medTitle(m, i, lang, true)} — ${rxLine(m, lang)}`),
  ];
  if (advice.length) lines.push('', t(lang, 'নিয়ম:', 'Advice:'), ...advice.map((a) => `• ${adviceText(a, lang)}`));
  if (v.next_visit) lines.push('', `${t(lang, 'আবার আসবেন', 'Next visit')}: ${dayDate(v.next_visit, lang)}`);
  if (ch.doctorName) lines.push('', `— ${t(lang, 'ডা.', 'Dr.')} ${ch.doctorName}`);
  return lines.join('\n');
}

const CSS = `
@page { size: A5; margin: 12mm; }
* { box-sizing: border-box; }
body { font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'Nirmala UI', sans-serif; color: #17231E; font-size: 13pt; margin: 0; }
.head { text-align: center; border-bottom: 1.5px solid #24493D; padding-bottom: 8px; margin-bottom: 10px; }
.head h1 { font-family: Georgia, 'Hind Siliguri', serif; color: #24493D; font-size: 20pt; margin: 0; }
.muted { color: #55605A; font-size: 11pt; }
.pt { display: flex; justify-content: space-between; margin: 8px 0 12px; }
.rx { font-family: Georgia, serif; font-size: 22pt; color: #24493D; margin: 4px 0; }
ol { margin: 0; padding-left: 22px; }
li { margin-bottom: 8px; }
li b { font-size: 13.5pt; }
.form { font-size: 10pt; color: #55605A; border: 1px solid #D9D3C4; border-radius: 10px; padding: 0 6px; margin-left: 4px; }
.advice { margin-top: 12px; }
.advice ul { margin: 4px 0 0; padding-left: 20px; font-size: 12pt; }
.foot { display: flex; justify-content: space-between; border-top: 1px solid #E2DDD0; margin-top: 16px; padding-top: 8px; }
.sign { margin-top: 36px; text-align: right; }
`;

export function rxHtml({ v, p, ch, advice, lang }: RxData) {
  const meds = v.meds
    .map((m, i) => `<li><b>${esc(medTitle(m, i, lang, true))}</b><span class="form">${esc(formLabel(m.form, lang))}</span><br/>${esc(rxLine(m, lang))}</li>`)
    .join('');
  const age = p.age != null ? `${n(p.age, lang)} ${t(lang, 'বছর', 'yrs')} · ` : '';
  return `<!doctype html><html><head><meta charset="utf-8"/><style>${CSS}</style></head><body>
  <div class="head"><h1>${esc(ch.chamberName || '')}</h1>
    <div class="muted">${esc(doctorLine(ch, lang))}</div>
    <div class="muted">${esc([ch.address, ch.phone].filter(Boolean).join(' · '))}</div></div>
  <div class="pt"><div><b>${esc(p.name)}</b><br/><span class="muted">${age}${t(lang, 'আইডি', 'ID')} ${n(code4(p.code), lang)}</span></div>
    <div style="text-align:right"><span class="muted">${t(lang, 'তারিখ', 'Date')}</span><br/><b>${slashDate(v.date, lang)}</b></div></div>
  <div class="rx">℞</div><ol>${meds}</ol>
  ${advice.length ? `<div class="advice"><b>${t(lang, 'নিয়ম', 'Advice')}</b><ul>${advice.map((a) => `<li>${esc(adviceText(a, lang))}</li>`).join('')}</ul></div>` : ''}
  <div class="foot"><span>${v.next_visit ? `${t(lang, 'আবার আসবেন', 'Next visit')}: <b>${dayDate(v.next_visit, lang)}</b>` : ''}</span>
    <span>${esc(payText({ v, lang }))}</span></div>
  <div class="sign">${ch.doctorName ? esc(`${t(lang, 'ডা.', 'Dr.')} ${ch.doctorName}`) : ''}</div>
  </body></html>`;
}

/** Small bottle labels (50 × 30 mm), one per medicine. */
export function labelsHtml({ v, p, ch, lang }: RxData) {
  const labels = v.meds
    .map(
      (m, i) => `<div class="l"><div class="c">${esc(ch.chamberName || '')}</div><b>${esc(p.name)}</b>
      <div class="m">${esc(medTitle(m, i, lang, true))}</div><div>${esc(rxLine(m, lang))}</div><div class="d">${slashDate(v.date, lang)}</div></div>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
  @page { size: 50mm 30mm; margin: 0; }
  body { margin: 0; font-family: 'Hind Siliguri', 'Noto Sans Bengali', sans-serif; }
  .l { width: 50mm; height: 30mm; padding: 2mm 2.5mm; box-sizing: border-box; font-size: 7.5pt; line-height: 1.25; page-break-after: always; overflow: hidden; }
  .c { font-size: 6.5pt; color: #55605A; } .m { font-weight: 700; font-size: 9pt; } .d { font-size: 6.5pt; color: #55605A; }
  </style></head><body>${labels}</body></html>`;
}
