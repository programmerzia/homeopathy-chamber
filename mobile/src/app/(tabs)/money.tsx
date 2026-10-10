import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import * as SMS from 'expo-sms';
import { confirm, toast, useData } from '@/lib/hooks';
import { dues, getChamber, moneySummary } from '@/lib/repo';
import { api } from '@/lib/sync';
import { remove } from '@/lib/db';
import { prefs } from '@/lib/store';
import { count, iso, L, money, monthName, n, shortDate, today } from '@/lib/i18n';
import { METHODS } from '@/lib/labels';
import { Btn, Divider, H1, H2, Press, Row, Screen, Segmented, T } from '@/ui/kit';
import { Icon } from '@/ui/Icon';
import { C } from '@/ui/theme';

type Period = 'day' | 'month' | 'year';
function range(p: Period): [string, string] {
  const d = new Date();
  if (p === 'day') return [today(), today()];
  if (p === 'month') return [iso(new Date(d.getFullYear(), d.getMonth(), 1)), iso(new Date(d.getFullYear(), d.getMonth() + 1, 0))];
  return [`${d.getFullYear()}-01-01`, `${d.getFullYear()}-12-31`];
}
/** সেপ্টেম্বর → সেপ্টেম্বরের, মে → মে মাসের */
const bnPossessive = (m: string) => (/[ক-হড়ঢ়য়]$/.test(m) ? `${m}ের` : `${m} মাসের`);
const BAR = [C.primary, C.bar2, C.bar3, C.bar3];

export default function Money() {
  const [period, setPeriod] = useState<Period>('month');
  const [from, to] = range(period);
  const s = useData(() => moneySummary(from, to), [from, to], ['visits', 'payments', 'expenses']);
  const d = useData(dues, [], ['patients']);
  const [showExp, setShowExp] = useState(false);
  const now = new Date();

  const heroLabel = period === 'day' ? L('আজকের মোট আয়', "Today's income") : period === 'month' ? L(`${bnPossessive(monthName(now.getMonth()))} মোট আয়`, `${monthName(now.getMonth())} income`) : L(`${n(now.getFullYear())} সালের মোট আয়`, `${now.getFullYear()} income`);
  const max = Math.max(1, ...s.byMethod.map((m) => m.amt));

  const remindAll = async () => {
    if (!d.list.length) return;
    const ch = getChamber();
    const text = (name: string, amt: number) =>
      `প্রিয় ${name}, ${ch.chamberName || 'চেম্বার'}-এ আপনার ${money(amt, 'bn')} বাকি আছে। সুবিধামতো পরিশোধ করবেন। ধন্যবাদ।`;
    if (prefs.get().token) {
      if (!(await confirm(L('সবাইকে SMS পাঠাবেন?', 'SMS everyone?'), L(`${n(d.list.length)} জনকে বাকির কথা মনে করানো হবে`, `${d.list.length} patients will be reminded`), L('পাঠান', 'Send'), false))) return;
      try {
        const r = await api<{ sent: number; failed: number }>('/sms/send', { method: 'POST', json: { messages: d.list.filter((p) => p.phone).map((p) => ({ to: p.phone, text: text(p.name, p.due) })) } });
        toast(L(`${n(r.sent)}টি SMS পাঠানো হয়েছে`, `${r.sent} SMS sent`));
      } catch {
        toast(L('SMS পাঠানো যায়নি — ইন্টারনেট দেখুন', 'Could not send — check internet'));
      }
    } else if (await SMS.isAvailableAsync()) {
      await SMS.sendSMSAsync(d.list.map((p) => p.phone).filter(Boolean), `${ch.chamberName || 'চেম্বার'}: আপনার কিছু টাকা বাকি আছে। সুবিধামতো পরিশোধ করবেন। ধন্যবাদ।`);
    } else toast(L('এই ফোনে SMS পাঠানো যাচ্ছে না', 'SMS not available'));
  };

  return (
    <Screen top>
      <H1>{L('হিসাব', 'Money')}</H1>
      <Segmented<Period> h={46} options={[{ v: 'day', label: L('আজ', 'Today') }, { v: 'month', label: L('এই মাস', 'This month') }, { v: 'year', label: L('এই বছর', 'This year') }]} value={period} onChange={setPeriod} />

      <View style={{ gap: 4, padding: 18, backgroundColor: C.primary, borderRadius: 18 }}>
        <T size={16} color={C.onPrimaryMuted}>{heroLabel}</T>
        <T serif size={40} color="#FFFFFF" style={{ lineHeight: 46 }}>{money(s.income)}</T>
        <T size={16} color={C.onPrimaryMuted}>{L(`${count(s.visits)} বার রোগী দেখা হয়েছে`, `${count(s.visits)} consultations`)}</T>
      </View>

      <View style={{ gap: 12, padding: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16 }}>
        <H2>{L('কোন মাধ্যমে এলো', 'By payment method')}</H2>
        {METHODS.map((m, i) => {
          const amt = s.byMethod.find((x) => x.method === m.v)?.amt ?? 0;
          return (
            <View key={m.v} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <T size={17} style={{ width: 60 }}>{L(m.bn, m.en)}</T>
              <View style={{ flex: 1, height: 12, borderRadius: 6, backgroundColor: C.divider, overflow: 'hidden' }}>
                <View style={{ height: 12, width: `${Math.round((amt / max) * 100)}%`, backgroundColor: BAR[i], borderRadius: 6 }} />
              </View>
              <T size={17} w={700} style={{ width: 96, textAlign: 'right' }}>{money(amt)}</T>
            </View>
          );
        })}
      </View>

      <View style={{ gap: 10, padding: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>{L('লাভ-খরচ', 'Profit & expenses')}</H2>
          <Press onPress={() => router.push('/expense')} style={{ height: 40, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.dashed, justifyContent: 'center' }}>
            <T size={15} w={700} color={C.primary}>{L('+ খরচ লিখুন', '+ Add expense')}</T>
          </Press>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}><T size={17} w={500}>{L('আয়', 'Income')}</T><T size={17} w={500}>{money(s.income)}</T></Row>
        <Press onPress={() => setShowExp(!showExp)} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T size={17} w={500} color={C.dangerInk}>{L('খরচ (ওষুধ কেনা, ভাড়া)', 'Expenses (stock, rent)')} {s.expenses.length ? (showExp ? '▴' : '▾') : ''}</T>
          <T size={17} w={500} color={C.dangerInk}>− {money(s.expense)}</T>
        </Press>
        {showExp && s.expenses.map((e) => (
          <Row key={e.id} style={{ justifyContent: 'space-between', paddingLeft: 12 }}>
            <T size={15} color={C.muted} style={{ flex: 1 }} lines={1}>{shortDate(e.date)} · {e.note || L('খরচ', 'Expense')}</T>
            <T size={15} color={C.muted}>{money(e.amount)}</T>
            <Press accessibilityLabel={L('মুছুন', 'Delete')} hitSlop={8} onPress={async () => (await confirm(L('খরচ মুছবেন?', 'Delete expense?'), e.note, L('মুছুন', 'Delete'))) && remove('expenses', e.id)}>
              <Icon name="close" size={16} color={C.muted} />
            </Press>
          </Row>
        ))}
        <Divider />
        <Row style={{ justifyContent: 'space-between' }}>
          <T size={19} w={700} color={C.primaryInk}>{L('হাতে থাকল', 'Net')}</T>
          <T size={19} w={700} color={s.income - s.expense >= 0 ? C.primaryInk : C.dangerInk}>{money(s.income - s.expense)}</T>
        </Row>
      </View>

      <View style={{ gap: 10, padding: 16, backgroundColor: C.dangerSoft, borderRadius: 16 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <H2 style={{ color: C.dangerDeep }}>{L('বাকি টাকা', 'Money due')}</H2>
          <T size={17} w={700} color={C.dangerDeep}>{money(d.total)} · {L(`${n(d.list.length)} জন`, `${d.list.length} people`)}</T>
        </Row>
        {d.list.length === 0 && <T color={C.dangerDeep}>{L('কারো কাছে টাকা বাকি নেই', 'Nobody owes money')}</T>}
        {d.list.slice(0, 5).map((p) => (
          <Press key={p.id} onPress={() => router.push(`/patient/${p.id}`)} style={{ flexDirection: 'row', justifyContent: 'space-between', minHeight: 32, alignItems: 'center' }}>
            <T size={17} color={C.dangerDeep}>{p.name}</T>
            <T size={17} w={700} color={C.dangerDeep}>{money(p.due)}</T>
          </Press>
        ))}
        {d.list.length > 5 && (
          <Press onPress={() => router.navigate({ pathname: '/patients', params: { filter: 'due' } })}>
            <T size={15} w={700} color={C.dangerInk}>{L(`আরও ${n(d.list.length - 5)} জন দেখুন →`, `See ${d.list.length - 5} more →`)}</T>
          </Press>
        )}
        {d.list.length > 0 && <Btn kind="white" h={50} size={16} icon="message" label={L('সবাইকে SMS-এ মনে করিয়ে দিন', 'Remind everyone by SMS')} onPress={remindAll} style={{ borderRadius: 12 }} />}
      </View>
    </Screen>
  );
}
