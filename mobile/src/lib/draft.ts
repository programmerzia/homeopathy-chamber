import { router } from 'expo-router';
import { createStore, pushRecent } from './store';
import { addDays, today } from './i18n';
import { uid } from './db';
import { getChamber, getPatient, listAdvice, saveVisit } from './repo';
import type { CaseNotes, MedItem, Method, PayStatus, Visit, VisitStatus } from './types';

export type Draft = {
  patientId: string;
  status: VisitStatus;
  diseases: string[];
  complaint: string;
  case_notes: CaseNotes;
  meds: MedItem[];
  advice: string[]; // advice ids
  nextDays: number | null; // null = custom date
  nextDate: string | null;
  fee: number;
  med_cost: number;
  discount: number;
  includeDue: boolean;
  pay_status: PayStatus;
  method: Method;
  trx_id: string;
  partial: number; // amount received when pay_status = partial
};

const empty: Draft = {
  patientId: '', status: '', diseases: [], complaint: '', case_notes: {}, meds: [], advice: [], nextDays: 7, nextDate: addDays(today(), 7),
  fee: 0, med_cost: 0, discount: 0, includeDue: true, pay_status: 'full', method: 'cash', trx_id: '', partial: 0,
};
export const draft = createStore<Draft>(empty);

export function startVisit(patientId: string) {
  const p = getPatient(patientId);
  const ch = getChamber();
  draft.replace({
    ...empty,
    patientId,
    status: '',
    diseases: p?.diseases ?? [],
    advice: listAdvice().filter((a) => a.is_default).map((a) => a.id),
    nextDate: addDays(today(), 7),
    fee: ch.fee,
  });
}

/** Open the 3-step visit flow for a patient. */
export function beginVisit(patientId: string) {
  startVisit(patientId);
  pushRecent(patientId);
  router.push('/visit/problem');
}

export const updateMed = (key: string, patch: Partial<MedItem>) =>
  draft.set((d) => ({ meds: d.meds.map((m) => (m.key === key ? { ...m, ...patch } : m)) }));
export const removeMed = (key: string) => draft.set((d) => ({ meds: d.meds.filter((m) => m.key !== key) }));

export function totals(d: Draft, due: number) {
  const prev = d.includeDue ? Math.max(0, due) : 0;
  const total = Math.max(0, d.fee + d.med_cost - d.discount + prev);
  const paid = d.pay_status === 'full' ? total : d.pay_status === 'partial' ? Math.min(d.partial, total) : 0;
  return { prev, total, paid };
}

/** Persist the draft as a visit; returns the new visit id. */
export function commitVisit(): string {
  const d = draft.get();
  const p = getPatient(d.patientId)!;
  const { prev, total, paid } = totals(d, p.due);
  const v: Visit = {
    id: uid(),
    patient_id: d.patientId,
    date: today(),
    created_at: Date.now(),
    status: d.status,
    diseases: d.diseases,
    complaint: d.complaint.trim(),
    case_notes: d.case_notes,
    meds: d.meds,
    advice: d.advice,
    next_visit: d.nextDate,
    fee: d.fee,
    med_cost: d.med_cost,
    discount: d.discount,
    prev_due: prev,
    total,
    paid,
    pay_status: d.pay_status,
    method: d.method,
    trx_id: d.trx_id.trim(),
    lang: 'bn',
  };
  saveVisit(v);
  return v.id;
}
