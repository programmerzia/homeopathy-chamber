import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { familyOf, getPatient, savePatient } from '@/lib/repo';
import { pickStore } from '@/lib/pick';
import { useStore, pushRecent } from '@/lib/store';
import { beginVisit } from '@/lib/draft';
import { L, n, normPhone, toEnDigits } from '@/lib/i18n';
import type { Sex } from '@/lib/types';
import { Btn, Chip, Field, Footer, Header, Press, Row, Screen, Segmented, T } from '@/ui/kit';
import { Icon } from '@/ui/Icon';
import { C } from '@/ui/theme';

export default function NewPatient() {
  const params = useLocalSearchParams<{ id?: string; name?: string; phone?: string }>();
  const editing = params.id ? getPatient(params.id) : null;
  const [name, setName] = useState(editing?.name ?? params.name ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? params.phone ?? '');
  const [age, setAge] = useState(editing?.age != null ? n(editing.age) : '');
  const [sex, setSex] = useState<Sex>(editing?.sex ?? '');
  const [address, setAddress] = useState(editing?.address ?? '');
  const [tried, setTried] = useState(false);
  const diseases = useStore(pickStore, (s) => s.formDiseases);

  useEffect(() => {
    pickStore.set({ formDiseases: editing?.diseases ?? [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const digits = normPhone(phone);
  const family = useMemo(() => familyOf(digits, editing?.id), [digits, editing?.id]);
  const phoneOk = /^01[3-9]\d{8}$/.test(digits);
  const nameOk = name.trim().length > 0;

  const save = (then: 'list' | 'visit' | 'khata') => {
    setTried(true);
    if (!nameOk || !phoneOk) return;
    const ageNum = parseInt(toEnDigits(age), 10);
    const id = savePatient({
      ...(editing ? { id: editing.id } : {}),
      name: name.trim(),
      phone: digits,
      age: Number.isFinite(ageNum) ? ageNum : null,
      sex,
      address: address.trim(),
      diseases,
    });
    pushRecent(id);
    if (editing) return router.back();
    if (then === 'visit') {
      router.replace(`/patient/${id}`);
      beginVisit(id);
    } else if (then === 'khata') router.replace({ pathname: '/khata', params: { pid: id } });
    else router.replace(`/patient/${id}`);
  };

  return (
    <View style={{ flex: 1 }}>
      <Header close title={editing ? L('রোগীর তথ্য বদলান', 'Edit patient') : L('নতুন রোগী', 'New patient')} />
      <Screen
        footer={
          <Footer>
            {editing ? (
              <Btn label={L('সেভ করুন', 'Save')} iconRight="check" onPress={() => save('list')} />
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn style={{ flex: 1 }} kind="outline" size={18} label={L('শুধু সেভ', 'Save only')} onPress={() => save('list')} />
                <Btn style={{ flex: 1.5 }} label={L('সেভ করে দেখুন', 'Save & see')} onPress={() => save('visit')} />
              </View>
            )}
          </Footer>
        }
      >
        <View style={{ gap: 6 }}>
          <Field label={L('রোগীর নাম', "Patient's name")} required value={name} onChangeText={setName} autoFocus={!editing && !params.name} autoCapitalize="words" returnKeyType="next" />
          {tried && !nameOk && <T size={15} color={C.danger}>{L('নাম লিখুন', 'Enter a name')}</T>}
        </View>
        <View style={{ gap: 6 }}>
          <Field label={L('মোবাইল নম্বর', 'Mobile number')} required value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="01XXX-XXXXXX" maxLength={16} />
          {tried && !phoneOk && <T size={15} color={C.danger}>{L('১১ সংখ্যার মোবাইল নম্বর দিন (01…)', 'Enter an 11-digit mobile (01…)')}</T>}
        </View>

        {family.length > 0 && (
          <Row gap={12} style={{ padding: 14, backgroundColor: C.primarySoft, borderRadius: 14, alignItems: 'flex-start' }}>
            <Icon name="users" size={24} color={C.primaryInk} />
            <View style={{ flex: 1, gap: 2 }}>
              <T size={16} w={700} color={C.primaryInk}>{L(`এই নম্বরে আরও ${n(family.length)} জন আছেন`, `${family.length} more on this number`)}</T>
              <T size={15} color={C.primaryInk}>{family.map((f) => f.name).join(', ')} {L('— একই পরিবারে রাখা হবে', '— kept as one family')}</T>
            </View>
          </Row>
        )}

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label={L('বয়স', 'Age')} value={age} onChangeText={setAge} keyboardType="number-pad" maxLength={3} />
          </View>
          <View style={{ flex: 1.4, gap: 6 }}>
            <T size={17} w={700}>{L('লিঙ্গ', 'Sex')}</T>
            <Segmented options={[{ v: 'm' as Sex, label: L('পুরুষ', 'Male') }, { v: 'f' as Sex, label: L('মহিলা', 'Female') }]} value={sex} onChange={setSex} />
          </View>
        </View>

        <Field label={L('ঠিকানা', 'Address')} hint={L('(না দিলেও চলবে)', '(optional)')} value={address} onChangeText={setAddress} placeholder={L('গ্রাম / এলাকা', 'Village / area')} />

        <View style={{ gap: 8 }}>
          <T size={17} w={700}>{L('রোগ', 'Diseases')}</T>
          <Row wrap>
            {diseases.map((d) => (
              <Chip key={d} big kind="amber" label={`${d} ✓`} onPress={() => pickStore.set({ formDiseases: diseases.filter((x) => x !== d) })} />
            ))}
            <Chip big kind="dashed" label={L('+ রোগ বাছুন', '+ Pick disease')} onPress={() => router.push({ pathname: '/pick-disease', params: { key: 'form' } })} />
          </Row>
        </View>

        {!editing && (
          <Press onPress={() => save('khata')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.dashed, borderRadius: 16 }}>
            <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="camera" size={24} color={C.amberIcon} />
            </View>
            <View style={{ flex: 1 }}>
              <T size={17} w={700}>{L('পুরনো খাতার ছবি যোগ করুন', 'Add old notebook photos')}</T>
              <T size={15} color={C.muted}>{L('আগের লেখা হারাবে না', 'Keep the old records')}</T>
            </View>
          </Press>
        )}
      </Screen>
    </View>
  );
}
