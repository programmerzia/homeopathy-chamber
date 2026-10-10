import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { collectPayment, getPatient } from '@/lib/repo';
import { toast } from '@/lib/hooks';
import { L, money, n, toEnDigits } from '@/lib/i18n';
import type { Method } from '@/lib/types';
import { Btn, Chip, Input, Row, Sheet, T } from '@/ui/kit';
import { MethodGrid } from '@/ui/MethodGrid';
import { C } from '@/ui/theme';

export default function Collect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = getPatient(id);
  const due = Math.max(0, p?.due ?? 0);
  const [amount, setAmount] = useState(n(due));
  const [method, setMethod] = useState<Method>('cash');
  const [trx, setTrx] = useState('');
  if (!p) return null;

  const value = parseFloat(toEnDigits(amount)) || 0;
  const save = () => {
    if (value <= 0) return;
    collectPayment(p.id, value, method, trx.trim());
    toast(L(`${money(value)} জমা হয়েছে`, `${money(value)} received`));
    router.back();
  };

  return (
    <Sheet
      label={p.name}
      title={L('টাকা জমা নিন', 'Collect money')}
      subtitle={L(`মোট বাকি ${money(due)}`, `Total due ${money(due)}`)}
      footer={<Btn label={L('জমা করুন', 'Save')} iconRight="check" disabled={value <= 0} onPress={save} />}
    >
      <View style={{ gap: 8 }}>
        <T size={17} w={700}>{L('কত টাকা পেলেন?', 'Amount received')}</T>
        <Input value={amount} onChangeText={setAmount} keyboardType="number-pad" selectTextOnFocus style={{ fontSize: 26 }} />
        <Row wrap>
          {[due, Math.round(due / 2)].filter((x, i, a) => x > 0 && a.indexOf(x) === i).map((x) => (
            <Chip key={x} label={money(x)} on={value === x} onPress={() => setAmount(n(x))} />
          ))}
        </Row>
      </View>
      <View style={{ gap: 10 }}>
        <T size={17} w={700}>{L('কীভাবে দিলেন?', 'Paid by')}</T>
        <MethodGrid value={method} onChange={setMethod} />
        {method !== 'cash' && <Input value={trx} onChangeText={setTrx} placeholder={L('লেনদেন নম্বর (TrxID)', 'Transaction ID (TrxID)')} autoCapitalize="characters" />}
      </View>
      {value > due && <T size={15} color={C.amberInk}>{L('বাকির চেয়ে বেশি — বাড়তি টাকা অগ্রিম হিসেবে থাকবে', 'More than due — the extra stays as advance')}</T>}
    </Sheet>
  );
}
