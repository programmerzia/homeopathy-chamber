import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { getChamber, saveChamber } from '@/lib/repo';
import { toast } from '@/lib/hooks';
import { L, n, toEnDigits } from '@/lib/i18n';
import { Btn, Chip, Field, Footer, Header, Row, Screen, T } from '@/ui/kit';
import { C } from '@/ui/theme';

export default function Fees() {
  const ch = getChamber();
  const [fee, setFee] = useState(n(ch.fee));
  const [bkash, setBkash] = useState(ch.bkash);
  const [nagad, setNagad] = useState(ch.nagad);
  const [rocket, setRocket] = useState(ch.rocket);
  const save = () => {
    saveChamber({ fee: parseFloat(toEnDigits(fee)) || 0, bkash: bkash.trim(), nagad: nagad.trim(), rocket: rocket.trim() });
    toast(L('সেভ হয়েছে', 'Saved'));
    router.back();
  };
  return (
    <View style={{ flex: 1 }}>
      <Header title={L('ফি ও পেমেন্ট', 'Fees & payment')} />
      <Screen footer={<Footer><Btn label={L('সেভ করুন', 'Save')} iconRight="check" onPress={save} /></Footer>}>
        <View style={{ gap: 8 }}>
          <Field label={L('সাধারণ ভিজিট ফি (৳)', 'Default visit fee (৳)')} value={fee} onChangeText={setFee} keyboardType="number-pad" />
          <Row wrap>{[100, 200, 300, 500].map((x) => <Chip key={x} label={`৳${n(x)}`} on={toEnDigits(fee) === String(x)} onPress={() => setFee(n(x))} />)}</Row>
          <T size={15} color={C.muted}>{L('প্রতি ভিজিটে এই ফি আগে থেকে বসানো থাকবে, দরকারে বদলানো যাবে।', 'Pre-filled for each visit; you can change it any time.')}</T>
        </View>
        <Field label={L('বিকাশ নম্বর', 'bKash number')} value={bkash} onChangeText={setBkash} keyboardType="phone-pad" />
        <Field label={L('নগদ নম্বর', 'Nagad number')} value={nagad} onChangeText={setNagad} keyboardType="phone-pad" />
        <Field label={L('রকেট নম্বর', 'Rocket number')} value={rocket} onChangeText={setRocket} keyboardType="phone-pad" />
      </Screen>
    </View>
  );
}
