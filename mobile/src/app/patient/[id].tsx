import { useEffect } from 'react';
import { Linking, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as SMS from 'expo-sms';
import { confirm, toast, useData } from '@/lib/hooks';
import { addToQueue, getPatient, patientPayments, patientPhotos, patientVisits } from '@/lib/repo';
import { remove } from '@/lib/db';
import { beginVisit } from '@/lib/draft';
import { prefs, pushRecent } from '@/lib/store';
import { doseLine } from '@/lib/dose';
import { code4, methodLabel, sexLabel, STATUS, statusLabel } from '@/lib/labels';
import { L, longDate, money, n } from '@/lib/i18n';
import type { Visit } from '@/lib/types';
import { Avatar, Chip, Empty, H2, Header, Press, Row, Screen, T, Tag, Btn } from '@/ui/kit';
import { Icon, type IconName } from '@/ui/Icon';
import { KhataImage } from '@/ui/Photo';
import { C } from '@/ui/theme';

export default function PatientPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = useData(() => getPatient(id), [id], ['patients']);
  const visits = useData(() => patientVisits(id), [id], ['visits']);
  const payments = useData(() => patientPayments(id), [id], ['payments']);
  const photos = useData(() => patientPhotos(id), [id], ['khata_photos']);

  useEffect(() => {
    pushRecent(id);
  }, [id]);

  if (!p || (p as any).deleted) {
    return (
      <View style={{ flex: 1 }}>
        <Header title={L('রোগীর পাতা', 'Patient')} />
        <Empty icon="users" text={L('রোগী পাওয়া যায়নি', 'Patient not found')} />
      </View>
    );
  }

  const since = new Date(p.created_at).getFullYear();
  const lang = prefs.get().lang;

  const sms = async () => {
    if (!(await SMS.isAvailableAsync())) return toast(L('এই ফোনে SMS পাঠানো যাচ্ছে না', 'SMS not available on this phone'));
    await SMS.sendSMSAsync([p.phone], '');
  };
  const del = async () => {
    if (await confirm(L('রোগী মুছবেন?', 'Delete patient?'), L(`${p.name}-এর সব তথ্য তালিকা থেকে সরে যাবে।`, `${p.name} will be removed from the list.`), L('মুছুন', 'Delete'))) {
      remove('patients', p.id);
      router.back();
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header
        title={L('রোগীর পাতা', 'Patient')}
        right={
          <Press onPress={() => router.push({ pathname: '/patient/new', params: { id: p.id } })} style={{ height: 48, paddingHorizontal: 8, justifyContent: 'center' }}>
            <T size={17} w={700} color={C.primary}>{L('এডিট', 'Edit')}</T>
          </Press>
        }
      />
      <Screen>
        <Row gap={14}>
          <Avatar name={p.name} size={68} dark />
          <View style={{ flex: 1, gap: 2 }}>
            <T size={26} w={700} selectable>{p.name}</T>
            <T size={16} color={C.muted}>
              {[p.age != null ? L(`${n(p.age)} বছর`, `${p.age} yrs`) : '', sexLabel(p.sex), L(`আইডি ${n(code4(p.code))}`, `ID ${code4(p.code)}`)].filter(Boolean).join(' · ')}
            </T>
            <T size={16} color={C.muted}>
              {p.visit_count ? L(`${n(since)} থেকে · ${n(p.visit_count)} বার এসেছেন`, `Since ${since} · ${p.visit_count} visits`) : L('এখনো দেখা হয়নি', 'Not seen yet')}
            </T>
          </View>
        </Row>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Action icon="phone" label={L('কল', 'Call')} onPress={() => Linking.openURL(`tel:${p.phone}`)} />
          <Action icon="message" label="SMS" onPress={sms} />
          <Action icon="plus" label={L('রোগী দেখুন', 'See now')} primary onPress={() => beginVisit(p.id)} />
        </View>

        {p.due > 0 && (
          <Row style={{ justifyContent: 'space-between', padding: 12, paddingLeft: 16, backgroundColor: C.dangerSoft, borderRadius: 16 }}>
            <View>
              <T size={15} color={C.dangerInk}>{L('বাকি টাকা', 'Money due')}</T>
              <T size={22} w={700} color={C.dangerInk}>{money(p.due)}</T>
            </View>
            <Press onPress={() => router.push({ pathname: '/patient/collect', params: { id: p.id } })} style={{ height: 48, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.dangerBorder, justifyContent: 'center' }}>
              <T size={16} w={700} color={C.dangerInk}>{L('টাকা জমা নিন', 'Collect')}</T>
            </Press>
          </Row>
        )}

        <View style={{ gap: 8 }}>
          <H2>{L('রোগ', 'Diseases')}</H2>
          <Row wrap>
            {p.diseases.map((d) => <Chip key={d} big kind="amber" label={d} onPress={() => router.push({ pathname: '/pick-disease', params: { key: p.id } })} />)}
            <Chip big kind="dashed" label={L('+ যোগ করুন', '+ Add')} onPress={() => router.push({ pathname: '/pick-disease', params: { key: p.id } })} />
          </Row>
        </View>

        <View style={{ gap: 10 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <H2>{L('খাতার ছবি', 'Notebook photos')}</H2>
            {photos.length > 0 && (
              <Press onPress={() => router.push({ pathname: '/photos', params: { pid: p.id } })} hitSlop={8}>
                <T size={16} w={600} color={C.primary}>{L(`সব দেখুন (${n(photos.length)})`, `See all (${photos.length})`)}</T>
              </Press>
            )}
          </Row>
          <Row gap={12} style={{ alignItems: 'flex-start' }}>
            {photos.slice(0, 3).map((ph, i) => (
              <Press key={ph.id} onPress={() => router.push({ pathname: '/photos', params: { pid: p.id, open: ph.id } })} style={{ alignItems: 'center', gap: 6 }}>
                <KhataImage photo={ph} style={{ width: 86, height: 108, borderRadius: 8, borderWidth: 1, borderColor: C.paperBorder, transform: [{ rotate: ['-2deg', '1.5deg', '-1deg'][i] }] }} />
                <T size={13} color={C.muted}>{ph.year ? `${n(ph.year)} · ` : ''}{L(`পাতা ${n(ph.page)}`, `p. ${ph.page}`)}</T>
              </Press>
            ))}
            <Press onPress={() => router.push({ pathname: '/khata', params: { pid: p.id } })} style={{ width: 86, height: 108, borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.dashed, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Icon name="camera" size={26} color={C.primary} />
              <T size={14} w={700} color={C.primary}>{L('ছবি তুলুন', 'Take photo')}</T>
            </Press>
          </Row>
        </View>

        <View style={{ gap: 10 }}>
          <H2>{L('আগের ভিজিট', 'Past visits')}</H2>
          {visits.length === 0 && <T color={C.muted}>{L('এখনো কোনো ভিজিট নেই', 'No visits yet')}</T>}
          {visits.map((v) => <VisitCard key={v.id} v={v} lang={lang} />)}
          {payments.map((pm) => (
            <Row key={pm.id} style={{ justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border }}>
              <T size={16}>{longDate(pm.date)} · {L('বাকি জমা', 'Due paid')}</T>
              <T size={16} w={700} color={C.primaryInk}>{money(pm.amount)} · {methodLabel(pm.method)}</T>
            </Row>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
          <Btn style={{ flex: 1 }} kind="outline" h={50} size={16} icon="list" label={L('সিরিয়ালে দিন', 'Add to serial')} onPress={() => {
              const num = addToQueue(p.id);
              toast(L(`সিরিয়াল নম্বর ${n(num)}`, `Serial no. ${num}`));
            }} />
          <Btn kind="danger" h={50} size={16} icon="trash" label={L('মুছুন', 'Delete')} onPress={del} />
        </View>
      </Screen>
    </View>
  );
}

function Action({ icon, label, primary, onPress }: { icon: IconName; label: string; primary?: boolean; onPress: () => void }) {
  return (
    <Press haptic onPress={onPress} accessibilityRole="button" style={{ flex: 1, height: 76, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: primary ? C.primary : C.surface, borderWidth: primary ? 0 : 1, borderColor: C.line }}>
      <Icon name={icon} size={24} color={primary ? '#FFFFFF' : C.ink} />
      <T size={16} w={700} color={primary ? '#FFFFFF' : C.ink}>{label}</T>
    </Press>
  );
}

function VisitCard({ v, lang }: { v: Visit; lang: 'bn' | 'en' }) {
  const m = v.meds[0];
  return (
    <Press onPress={() => router.push(`/rx/${v.id}`)} style={{ gap: 8, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T size={17} w={700}>{longDate(v.date)}</T>
        {!!v.status && <Tag label={statusLabel(v.status)} tone={STATUS[v.status].tone} />}
      </Row>
      {!!v.complaint && <T size={16} color={C.body} lines={3}>{v.complaint}</T>}
      {m && (
        <Row wrap>
          <View style={{ backgroundColor: C.amberSoft, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
            <T size={16} w={700} color={C.amberInk}>{m.name} {m.potency}</T>
          </View>
          <T size={15} color={C.muted}>{doseLine(m, lang)}{v.meds.length > 1 ? L(` · আরও ${n(v.meds.length - 1)}টি`, ` · +${v.meds.length - 1}`) : ''}</T>
        </Row>
      )}
      <T size={15} color={C.muted}>
        {L('ফি', 'Fee')} {money(v.fee + v.med_cost - v.discount)} · {v.pay_status === 'later' ? L('পরে দেবেন', 'Pay later') : `${methodLabel(v.method)}${v.pay_status === 'partial' ? L(` · ${money(v.paid)} দিয়েছেন`, ` · paid ${money(v.paid)}`) : ''}`}
      </T>
    </Press>
  );
}
