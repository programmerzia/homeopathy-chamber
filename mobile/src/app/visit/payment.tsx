import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { commitVisit, draft, totals } from '@/lib/draft';
import { useStore } from '@/lib/store';
import { getPatient } from '@/lib/repo';
import { L, money, n, toEnDigits } from '@/lib/i18n';
import type { PayStatus } from '@/lib/types';
import { discardVisit } from '@/features/visit';
import { Btn, Divider, Footer, H2, Header, Input, Press, Row, Screen, Segmented, Steps, T, fs } from '@/ui/kit';
import { Icon } from '@/ui/Icon';
import { MethodGrid } from '@/ui/MethodGrid';
import { C } from '@/ui/theme';

const num = (t: string) => parseFloat(toEnDigits(t).replace(/[^\d.]/g, '')) || 0;

function Amount({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [text, setText] = useState(value ? n(value) : '');
  return (
    <Row gap={2} style={{ minWidth: 96, paddingHorizontal: 10, height: 42, borderRadius: 10, backgroundColor: C.bg, justifyContent: 'flex-end' }}>
      <T size={18} w={700}>৳</T>
      <TextInput
        value={text}
        onChangeText={(t) => { setText(t); onChange(num(t)); }}
        keyboardType="number-pad"
        selectTextOnFocus
        accessibilityLabel={label}
        placeholder="০"
        placeholderTextColor={C.muted}
        style={{ minWidth: 40, textAlign: 'right', fontSize: fs(18), fontFamily: 'HindSiliguri_700Bold', color: C.ink, paddingVertical: 0 }}
      />
    </Row>
  );
}

export default function VisitPayment() {
  const d = useStore(draft, (s) => s);
  const p = getPatient(d.patientId);
  const [showDiscount, setShowDiscount] = useState(d.discount > 0);
  const [received, setReceived] = useState<number | null>(null);
  const [otherReceived, setOtherReceived] = useState(false);
  if (!p) return null;

  const due = Math.max(0, p.due);
  const { prev, total, paid } = totals(d, due);
  const noteOptions = Array.from(new Set([Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000].filter((x) => x >= total && x > 0))).slice(0, 2);
  const change = received !== null ? received - total : null;

  const save = () => {
    const id = commitVisit();
    router.dismissAll();
    router.push({ pathname: '/rx/[id]', params: { id, saved: '1' } });
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title={L('রোগী দেখা', 'Consultation')} right={<Press onPress={discardVisit} hitSlop={8}><Icon name="close" size={24} color={C.muted} /></Press>} />
      <Screen footer={<Footer><Btn label={L('সেভ করুন', 'Save')} iconRight="check" onPress={save} /></Footer>}>
        <Steps at={3} />

        <View style={{ gap: 4, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16 }}>
          <Line label={L('ভিজিট ফি', 'Visit fee')}><Amount label={L('ভিজিট ফি', 'Visit fee')} value={d.fee} onChange={(v) => draft.set({ fee: v })} /></Line>
          <Line label={L('ওষুধের দাম', 'Medicine price')}><Amount label={L('ওষুধের দাম', 'Medicine price')} value={d.med_cost} onChange={(v) => draft.set({ med_cost: v })} /></Line>
          <Line label={L('ছাড়', 'Discount')}>
            {showDiscount ? (
              <Amount label={L('ছাড়', 'Discount')} value={d.discount} onChange={(v) => draft.set({ discount: v })} />
            ) : (
              <Press onPress={() => setShowDiscount(true)} style={{ height: 40, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.dashed, justifyContent: 'center' }}>
                <T size={16} w={600} color={C.primary}>{L('+ ছাড় দিন', '+ Discount')}</T>
              </Press>
            )}
          </Line>
          {due > 0 && (
            <Line label={L('আগের বাকি', 'Previous due')}>
              <Row gap={8}>
                <Press onPress={() => draft.set({ includeDue: !d.includeDue })} accessibilityRole="switch" accessibilityState={{ checked: d.includeDue }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: d.includeDue ? C.primarySoft : C.divider }}>
                  {d.includeDue && <Icon name="check" size={14} color={C.primaryInk} sw={2.6} />}
                  <T size={14} w={600} color={d.includeDue ? C.primaryInk : C.muted}>{d.includeDue ? L('যোগ হয়েছে', 'Added') : L('যোগ করুন', 'Add')}</T>
                </Press>
                <View style={{ minWidth: 84, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: C.bg }}>
                  <T size={18} w={700} style={{ textAlign: 'right', opacity: d.includeDue ? 1 : 0.4 }}>{money(due)}</T>
                </View>
              </Row>
            </Line>
          )}
          <Divider style={{ marginVertical: 6 }} />
          <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <T size={19} w={700}>{L('মোট', 'Total')}</T>
            <T serif size={34}>{money(total)}</T>
          </Row>
        </View>

        <View style={{ gap: 10 }}>
          <H2>{L('টাকা কত পেলেন?', 'How much was paid?')}</H2>
          <Segmented<PayStatus>
            options={[{ v: 'full', label: L('পুরো টাকা', 'Full') }, { v: 'partial', label: L('কিছু টাকা', 'Part') }, { v: 'later', label: L('পরে দেবে', 'Later') }]}
            value={d.pay_status}
            onChange={(v) => draft.set({ pay_status: v, partial: v === 'partial' && !d.partial ? Math.round(total / 2) : d.partial })}
          />
        </View>

        {d.pay_status === 'partial' && (
          <View style={{ gap: 8 }}>
            <T size={17} w={700}>{L('কত টাকা দিলেন?', 'Amount paid')}</T>
            <Input keyboardType="number-pad" defaultValue={n(d.partial)} selectTextOnFocus onChangeText={(t) => draft.set({ partial: num(t) })} style={{ fontSize: 24 }} />
            <T size={16} w={600} color={C.dangerInk}>{L(`বাকি থাকবে ${money(total - paid)}`, `${money(total - paid)} stays due`)}</T>
          </View>
        )}

        {d.pay_status !== 'later' ? (
          <View style={{ gap: 10 }}>
            <H2>{L('কীভাবে দিলেন?', 'Paid by')}</H2>
            <MethodGrid value={d.method} onChange={(m) => draft.set({ method: m })} />
            {d.method !== 'cash' ? (
              <Input value={d.trx_id} onChangeText={(t) => draft.set({ trx_id: t })} placeholder={L('লেনদেন নম্বর (TrxID) — না দিলেও চলবে', 'Transaction ID (optional)')} autoCapitalize="characters" />
            ) : (
              <T size={15} color={C.muted}>{L('বিকাশ/নগদ/রকেট বাছলে লেনদেন নম্বর (TrxID) লেখার ঘর আসবে', 'Choosing bKash/Nagad/Rocket shows a TrxID field')}</T>
            )}
          </View>
        ) : (
          <View style={{ padding: 14, backgroundColor: C.dangerSoft, borderRadius: 14 }}>
            <T size={16} w={600} color={C.dangerInk}>{L(`${money(total)} রোগীর বাকি খাতায় যোগ হবে`, `${money(total)} will be added to the patient's dues`)}</T>
          </View>
        )}

        {d.pay_status === 'full' && d.method === 'cash' && total > 0 && (
          <View style={{ gap: 12, padding: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16 }}>
            <T size={17} w={700}>{L('রোগী কত টাকা দিলেন?', 'Cash handed over')}</T>
            <Row>
              {noteOptions.map((x) => {
                const on = received === x && !otherReceived;
                return (
                  <Press key={x} haptic onPress={() => { setOtherReceived(false); setReceived(x); }} style={{ flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.primary : C.surface, borderWidth: on ? 0 : 1, borderColor: C.line }}>
                    <T size={16} w={on ? 700 : 500} color={on ? '#FFFFFF' : C.ink}>{money(x)}</T>
                  </Press>
                );
              })}
              <Press haptic onPress={() => { setOtherReceived(true); setReceived(null); }} style={{ flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: otherReceived ? C.primary : C.surface, borderWidth: otherReceived ? 0 : 1, borderColor: C.line }}>
                <T size={16} w={otherReceived ? 700 : 500} color={otherReceived ? '#FFFFFF' : C.ink}>{L('অন্য', 'Other')}</T>
              </Press>
            </Row>
            {otherReceived && <Input autoFocus keyboardType="number-pad" placeholder={L('কত টাকা দিলেন', 'Amount given')} onChangeText={(t) => setReceived(num(t) || null)} />}
            {change !== null && (
              <Row style={{ justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: change >= 0 ? C.primarySoft : C.dangerSoft, borderRadius: 12 }}>
                <T size={18} w={600} color={change >= 0 ? C.primaryInk : C.dangerInk}>{change >= 0 ? L('ফেরত দিন', 'Give back') : L('আরও লাগবে', 'Still short')}</T>
                <T serif size={30} color={change >= 0 ? C.primaryInk : C.dangerInk}>{money(Math.abs(change))}</T>
              </Row>
            )}
          </View>
        )}
        {prev > 0 && d.pay_status === 'full' && <T size={14} color={C.muted}>{L('আগের বাকিসহ সব পরিশোধ হবে', 'Previous dues will be cleared too')}</T>}
      </Screen>
    </View>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', minHeight: 48 }}>
      <T size={17}>{label}</T>
      {children}
    </Row>
  );
}
