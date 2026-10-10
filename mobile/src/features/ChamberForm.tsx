import { useState } from 'react';
import { View } from 'react-native';
import { getChamber, saveChamber } from '@/lib/repo';
import { L, toEnDigits } from '@/lib/i18n';
import type { ChamberSettings } from '@/lib/types';
import { Btn, Field, Footer, Screen, T } from '@/ui/kit';
import { C } from '@/ui/theme';

/** Chamber details printed on prescriptions. Used by first-run setup and Settings. */
export function ChamberForm({ intro, cta, onSaved, withFee }: { intro?: React.ReactNode; cta: string; onSaved: () => void; withFee?: boolean }) {
  const init = getChamber();
  const [f, setF] = useState<ChamberSettings>(init);
  const [fee, setFee] = useState(String(init.fee));
  const [tried, setTried] = useState(false);
  const set = (k: keyof ChamberSettings) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const ok = f.chamberName.trim().length > 0;

  const save = () => {
    setTried(true);
    if (!ok) return;
    saveChamber({
      chamberName: f.chamberName.trim(), doctorName: f.doctorName.trim(), degree: f.degree.trim(), regNo: f.regNo.trim(),
      address: f.address.trim(), phone: f.phone.trim(), ...(withFee ? { fee: parseFloat(toEnDigits(fee)) || 0 } : {}),
    });
    onSaved();
  };

  return (
    <Screen footer={<Footer><Btn label={cta} iconRight="check" onPress={save} /></Footer>}>
      {intro}
      <View style={{ gap: 6 }}>
        <Field label={L('চেম্বারের নাম', 'Chamber name')} required value={f.chamberName} onChangeText={set('chamberName')} placeholder={L('যেমন: শিফা হোমিও হল', 'e.g. Shifa Homoeo Hall')} />
        {tried && !ok && <T size={15} color={C.danger}>{L('চেম্বারের নাম লিখুন', 'Enter the chamber name')}</T>}
      </View>
      <Field label={L('ডাক্তারের নাম', "Doctor's name")} value={f.doctorName} onChangeText={set('doctorName')} autoCapitalize="words" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><Field label={L('ডিগ্রি', 'Degree')} value={f.degree} onChangeText={set('degree')} placeholder="DHMS" /></View>
        <View style={{ flex: 1 }}><Field label={L('রেজি. নং', 'Reg. no.')} value={f.regNo} onChangeText={set('regNo')} /></View>
      </View>
      <Field label={L('ঠিকানা', 'Address')} value={f.address} onChangeText={set('address')} />
      <Field label={L('চেম্বারের ফোন', 'Chamber phone')} value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
      {withFee && <Field label={L('সাধারণ ভিজিট ফি (৳)', 'Default visit fee (৳)')} value={fee} onChangeText={setFee} keyboardType="number-pad" />}
    </Screen>
  );
}
