export type Sex = 'm' | 'f' | '';
export type Patient = {
  id: string;
  code: number;
  name: string;
  phone: string;
  age: number | null;
  sex: Sex;
  address: string;
  diseases: string[];
  created_at: number;
  // derived locally (not synced)
  due: number;
  visit_count: number;
  last_visit: string | null;
  last_medicine: string | null;
  next_visit: string | null;
};

export type Form = 'globule' | 'tablet' | 'drop' | 'mother' | 'lm' | 'syrup' | 'powder' | 'ointment';
export type Slot = 'morning' | 'noon' | 'night';
export type Timing = 'empty' | 'before' | 'after' | 'bed' | '';
/** times: 1..4 per day, 0 = single dose, -1 = when needed */
export type MedItem = {
  key: string;
  medicine_id: string | null;
  name: string;
  potency: string;
  form: Form;
  qty: number;
  water: boolean;
  times: number;
  slots: Slot[];
  timing: Timing;
  days: number; // 0 = until finished
  hide: boolean;
  note?: string;
};

export type VisitStatus = 'much_better' | 'better' | 'same' | 'worse' | '';
export type PayStatus = 'full' | 'partial' | 'later';
export type Method = 'cash' | 'bkash' | 'nagad' | 'rocket';
export type CaseNotes = { mind?: string; modality?: string; appetite?: string; sleep?: string; other?: string };

export type Visit = {
  id: string;
  patient_id: string;
  date: string;
  created_at: number;
  status: VisitStatus;
  diseases: string[];
  complaint: string;
  case_notes: CaseNotes;
  meds: MedItem[];
  advice: string[];
  next_visit: string | null;
  fee: number;
  med_cost: number;
  discount: number;
  prev_due: number;
  total: number;
  paid: number;
  pay_status: PayStatus;
  method: Method;
  trx_id: string;
  lang: 'bn' | 'en';
};

export type Medicine = {
  id: string;
  name: string;
  potencies: string[];
  forms: Form[];
  grp: string;
  stock: 'in' | 'low' | 'out' | '';
  custom: number;
  use_count: number;
  doses: Record<string, number>; // dose signature -> use count
};

export type Disease = { id: string; name_bn: string; name_en: string; custom: number };
export type AdviceCat = 'rule' | 'food' | 'storage' | 'mine';
export type Advice = { id: string; text_bn: string; text_en: string; short_bn: string; short_en: string; cat: AdviceCat; is_default: number; sort: number };
export type Template = { id: string; name: string; meds: MedItem[]; advice: string[] };
export type QueueItem = { id: string; date: string; num: number; patient_id: string; status: 'waiting' | 'seen' | 'skipped'; created_at: number };
export type Payment = { id: string; patient_id: string; amount: number; method: Method; trx_id: string; date: string; created_at: number };
export type Expense = { id: string; date: string; amount: number; note: string; created_at: number };
export type KhataPhoto = { id: string; patient_id: string; year: number | null; page: number; uri: string; uploaded: number; created_at: number };

export type ChamberSettings = {
  chamberName: string;
  doctorName: string;
  degree: string;
  regNo: string;
  address: string;
  phone: string;
  fee: number;
  bkash: string;
  nagad: string;
  rocket: string;
  smsReminders: boolean;
};
