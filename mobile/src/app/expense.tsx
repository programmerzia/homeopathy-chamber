import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { addExpense } from '@/lib/repo';
import { toast } from '@/lib/hooks';
import { L, money, toEnDigits } from '@/lib/i18n';
import { Btn, Chip, Field, Row, Sheet } from '@/ui/kit';

const PRESETS: [string, string][] = [['ওষুধ কেনা', 'Medicine stock'], ['ঘর ভাড়া', 'Rent'], ['বিদ্যুৎ বিল', 'Electricity'], ['কর্মচারী', 'Staff'], ['শিশি-বোতল', 'Bottles & vials'], ['যাতায়াত', 'Transport']];

export default function Expense() {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const value = parseFloat(toEnDigits(amount)) || 0;
  const save = () => {
    addExpense(value, note.trim());
    toast(L(`${money(value)} খরচ লেখা হলো`, `${money(value)} expense saved`));
    router.back();
  };
  return (
    <Sheet title={L('খরচ লিখুন', 'Add expense')} footer={<Btn label={L('সেভ করুন', 'Save')} iconRight="check" disabled={value <= 0} onPress={save} />}>
      <Field label={L('কত টাকা?', 'Amount')} required value={amount} onChangeText={setAmount} keyboardType="number-pad" autoFocus style={{ fontSize: 26 }} />
      <View style={{ gap: 8 }}>
        <Field label={L('কিসের খরচ?', 'For what?')} value={note} onChangeText={setNote} placeholder={L('যেমন: ওষুধ কেনা', 'e.g. medicine stock')} />
        <Row wrap>
          {PRESETS.map(([bn, en]) => <Chip key={bn} label={L(bn, en)} on={note === L(bn, en)} onPress={() => setNote(L(bn, en))} />)}
        </Row>
      </View>
    </Sheet>
  );
}
