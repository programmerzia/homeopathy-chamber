import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getMedicine, saveMedicine } from '@/lib/repo';
import { remove } from '@/lib/db';
import { confirm, toast } from '@/lib/hooks';
import { FORMS } from '@/lib/dose';
import { L } from '@/lib/i18n';
import type { Form, Medicine } from '@/lib/types';
import { Btn, Chip, Field, Input, Row, Segmented, Sheet, T } from '@/ui/kit';

const STD = ['3X', '6X', '12X', '30X', '6', '30C', '200C', '1M', '10M', '50M', 'CM', 'Q', 'LM1', 'LM3', 'LM6'];

export default function MedicineEdit() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const m = params.id ? getMedicine(params.id) : null;
  const [name, setName] = useState(m?.name ?? params.name ?? '');
  const [stock, setStock] = useState<Medicine['stock']>(m?.stock ?? 'in');
  const [potencies, setPotencies] = useState<string[]>(m?.potencies ?? ['30C', '200C']);
  const [forms, setForms] = useState<Form[]>(m?.forms ?? ['globule']);
  const [grp, setGrp] = useState(m?.grp ?? '');
  const [extra, setExtra] = useState('');

  const toggle = <X,>(arr: X[], x: X) => (arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x]);
  const valid = name.trim() && forms.length;
  const save = () => {
    saveMedicine({ ...(m ? { id: m.id } : {}), name: name.trim(), stock, potencies, forms, grp: grp.trim() });
    toast(L('সেভ হয়েছে', 'Saved'));
    router.back();
  };
  const del = async () => {
    if (m && (await confirm(L('ওষুধ মুছবেন?', 'Delete medicine?'), m.name, L('মুছুন', 'Delete')))) {
      remove('medicines', m.id);
      router.back();
    }
  };

  return (
    <Sheet
      title={m ? m.name : L('নতুন ওষুধ', 'New medicine')}
      subtitle={m && !m.custom ? L('তালিকার ওষুধ — স্টক ও শক্তি বদলাতে পারেন', 'Built-in — you can change stock and potencies') : undefined}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {m?.custom ? <Btn style={{ flex: 1 }} kind="danger" size={17} label={L('মুছুন', 'Delete')} onPress={del} /> : null}
          <Btn style={{ flex: 2 }} label={L('সেভ করুন', 'Save')} iconRight="check" disabled={!valid} onPress={save} />
        </View>
      }
    >
      {(!m || m.custom === 1) && <Field label={L('ওষুধের নাম', 'Name')} required value={name} onChangeText={setName} autoFocus={!m} autoCapitalize="words" />}

      <View style={{ gap: 8 }}>
        <T size={17} w={700}>{L('স্টক', 'Stock')}</T>
        <Segmented<Medicine['stock']> options={[{ v: 'in', label: L('স্টকে', 'In stock') }, { v: 'low', label: L('কম আছে', 'Low') }, { v: 'out', label: L('নেই', 'Out') }, { v: '', label: '—' }]} value={stock} onChange={setStock} />
      </View>

      <View style={{ gap: 8 }}>
        <T size={17} w={700}>{L('শক্তি', 'Potencies')}</T>
        <Row wrap>
          {Array.from(new Set([...STD, ...potencies])).map((p) => <Chip key={p} label={p} on={potencies.includes(p)} onPress={() => setPotencies(toggle(potencies, p))} />)}
        </Row>
        <Row>
          <Input value={extra} onChangeText={setExtra} placeholder={L('অন্য শক্তি', 'Other potency')} autoCapitalize="characters" style={{ flex: 1, height: 50 }} />
          <Btn h={50} size={16} kind="outline" label={L('যোগ', 'Add')} disabled={!extra.trim()} onPress={() => { setPotencies([...potencies, extra.trim().toUpperCase()]); setExtra(''); }} />
        </Row>
      </View>

      <View style={{ gap: 8 }}>
        <T size={17} w={700}>{L('ধরন', 'Forms')}</T>
        <Row wrap>
          {FORMS.map((f) => <Chip key={f.key} label={L(f.bn, f.en)} on={forms.includes(f.key)} onPress={() => setForms(toggle(forms, f.key))} />)}
        </Row>
      </View>

      <Field label={L('গ্রুপ', 'Group')} hint={L('(যেমন: বায়োকেমিক, পেটেন্ট)', '(e.g. biochemic, patent)')} value={grp} onChangeText={setGrp} />
    </Sheet>
  );
}
