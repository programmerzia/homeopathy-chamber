import { L } from './i18n';
import type { Method, Sex, VisitStatus } from './types';

export const STATUS: Record<Exclude<VisitStatus, ''>, { bn: string; en: string; tone: 'green' | 'amber' | 'danger' }> = {
  much_better: { bn: 'অনেক ভালো', en: 'Much better', tone: 'green' },
  better: { bn: 'ভালো', en: 'Better', tone: 'green' },
  same: { bn: 'একই রকম', en: 'Same', tone: 'amber' },
  worse: { bn: 'খারাপ', en: 'Worse', tone: 'danger' },
};
export const statusLabel = (s: VisitStatus) => (s ? L(STATUS[s].bn, STATUS[s].en) : '');

export const METHODS: { v: Method; bn: string; en: string; subBn: string; subEn: string }[] = [
  { v: 'cash', bn: 'ক্যাশ', en: 'Cash', subBn: 'হাতে হাতে', subEn: 'In hand' },
  { v: 'bkash', bn: 'বিকাশ', en: 'bKash', subBn: 'মোবাইলে', subEn: 'Mobile' },
  { v: 'nagad', bn: 'নগদ', en: 'Nagad', subBn: 'মোবাইলে', subEn: 'Mobile' },
  { v: 'rocket', bn: 'রকেট', en: 'Rocket', subBn: 'মোবাইলে', subEn: 'Mobile' },
];
export const methodLabel = (m: Method, lang?: 'bn' | 'en') => {
  const x = METHODS.find((x) => x.v === m)!;
  return lang ? (lang === 'bn' ? x.bn : x.en) : L(x.bn, x.en);
};

export const sexLabel = (s: Sex) => (s === 'm' ? L('পুরুষ', 'Male') : s === 'f' ? L('মহিলা', 'Female') : '');
export const code4 = (c: number) => String(c).padStart(4, '0');
