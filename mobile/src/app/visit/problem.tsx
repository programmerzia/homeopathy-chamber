import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { draft } from '@/lib/draft';
import { useStore } from '@/lib/store';
import { dictate, useData } from '@/lib/hooks';
import { addDisease, getPatient, listDiseases, topDiseases } from '@/lib/repo';
import { VisitPatientCard, discardVisit } from '@/features/visit';
import { L } from '@/lib/i18n';
import { STATUS } from '@/lib/labels';
import type { CaseNotes, VisitStatus } from '@/lib/types';
import { Btn, Chip, Footer, H2, Header, Press, Row, Screen, Steps, T, fs } from '@/ui/kit';
import { Icon } from '@/ui/Icon';
import { C } from '@/ui/theme';

const CASE_FIELDS: { k: keyof CaseNotes; bn: string; en: string }[] = [
  { k: 'mind', bn: 'মন-মেজাজ', en: 'Mind & mood' },
  { k: 'modality', bn: 'কিসে বাড়ে-কমে', en: 'Better / worse from' },
  { k: 'appetite', bn: 'খিদে, পিপাসা, পায়খানা', en: 'Appetite, thirst, stool' },
  { k: 'sleep', bn: 'ঘুম ও স্বপ্ন', en: 'Sleep & dreams' },
  { k: 'other', bn: 'অন্যান্য', en: 'Other' },
];

export default function Problem() {
  const d = useStore(draft, (s) => s);
  const p = getPatient(d.patientId);
  const [dq, setDq] = useState('');
  const [caseOpen, setCaseOpen] = useState(Object.values(d.case_notes).some(Boolean));
  const common = useData(() => topDiseases(10), [], ['diseases']);
  const all = useData(listDiseases, [], ['diseases']);

  if (!p) return null;
  const suggestions = dq.trim()
    ? all.filter((x) => x.name_bn.includes(dq.trim()) || x.name_en.toLowerCase().includes(dq.trim().toLowerCase())).map((x) => x.name_bn)
    : common;
  const toggle = (name: string) => draft.set({ diseases: d.diseases.includes(name) ? d.diseases.filter((x) => x !== name) : [...d.diseases, name] });
  const statuses = Object.keys(STATUS) as Exclude<VisitStatus, ''>[];

  return (
    <View style={{ flex: 1 }}>
      <Header close title={L('রোগী দেখা', 'Consultation')} onBack={discardVisit} />
      <Screen footer={<Footer><Btn label={L('পরের ধাপ: ওষুধ', 'Next: Medicine')} iconRight="arrowRight" onPress={() => router.push('/visit/medicine')} /></Footer>}>
        <VisitPatientCard pid={p.id} />
        <Steps at={1} />

        {p.visit_count > 0 && (
          <View style={{ gap: 10 }}>
            <H2>{L('আগের বারের পর কেমন আছেন?', 'How since last time?')}</H2>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {statuses.map((s) => {
                const on = d.status === s;
                return (
                  <Press key={s} haptic accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => draft.set({ status: on ? '' : s })}
                    style={{ width: '48.5%', height: 58, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.primary : C.surface, borderWidth: on ? 0 : 1.5, borderColor: C.line }}>
                    <T size={18} w={on ? 700 : 500} color={on ? '#FFFFFF' : C.ink}>{L(STATUS[s].bn, STATUS[s].en)}</T>
                  </Press>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ gap: 10 }}>
          <H2>{L('রোগ', 'Disease')}</H2>
          {d.diseases.length > 0 && (
            <Row wrap>{d.diseases.map((x) => <Chip key={x} big kind="amber" label={`${x} ✓`} onPress={() => toggle(x)} />)}</Row>
          )}
          <Row gap={8} style={{ height: 50, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface }}>
            <Icon name="search" size={20} color={C.muted} sw={1.8} />
            <TextInput value={dq} onChangeText={setDq} placeholder={L('রোগের নাম লিখুন…', 'Type a disease…')} placeholderTextColor={C.muted} accessibilityLabel={L('রোগ খুঁজুন', 'Find disease')}
              style={{ flex: 1, fontSize: fs(17), fontFamily: 'HindSiliguri_400Regular', color: C.ink, paddingVertical: 0 }} />
          </Row>
          <Row wrap>
            {suggestions.filter((x) => !d.diseases.includes(x)).slice(0, 12).map((x) => <Chip key={x} label={x} onPress={() => { toggle(x); setDq(''); }} />)}
            {!!dq.trim() && !all.some((x) => x.name_bn === dq.trim()) && (
              <Chip kind="dashed" label={L(`+ “${dq.trim()}” যোগ`, `+ Add “${dq.trim()}”`)} onPress={() => { addDisease(dq.trim()); toggle(dq.trim()); setDq(''); }} />
            )}
          </Row>
        </View>

        <View style={{ gap: 10 }}>
          <H2>{L('সমস্যার কথা', 'Complaint')}</H2>
          <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, overflow: 'hidden' }}>
            <TextInput
              multiline
              value={d.complaint}
              onChangeText={(t) => draft.set({ complaint: t })}
              placeholder={L('রোগী কী বললেন…', 'What the patient says…')}
              placeholderTextColor={C.muted}
              accessibilityLabel={L('সমস্যার কথা', 'Complaint')}
              style={{ minHeight: 96, paddingHorizontal: 16, paddingVertical: 14, fontSize: fs(18), lineHeight: fs(28), fontFamily: 'HindSiliguri_400Regular', color: C.ink, textAlignVertical: 'top' }}
            />
            <Row style={{ padding: 10, borderTopWidth: 1, borderTopColor: C.divider, backgroundColor: C.footer }}>
              <SmallBtn icon="mic" label={L('মুখে বলুন', 'Dictate')} onPress={() => dictate((t) => draft.set((s) => ({ complaint: s.complaint ? `${s.complaint} ${t}` : t })))} />
              <SmallBtn icon="camera" label={L('ছবি / রিপোর্ট', 'Photo / report')} onPress={() => router.push({ pathname: '/khata', params: { pid: p.id } })} />
            </Row>
          </View>
        </View>

        <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16 }}>
          <Press onPress={() => setCaseOpen(!caseOpen)} accessibilityState={{ expanded: caseOpen }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 58, paddingHorizontal: 16, paddingVertical: 8 }}>
            <View style={{ flex: 1 }}>
              <T size={17} w={700}>{L('বিস্তারিত কেস লিখুন', 'Detailed case taking')}</T>
              <T size={14} color={C.muted}>{L('মন-মেজাজ, কিসে বাড়ে-কমে, খিদে-ঘুম', 'Mind, modalities, appetite, sleep')}</T>
            </View>
            <Icon name={caseOpen ? 'chevronDown' : 'chevronRight'} size={22} color={C.muted} />
          </Press>
          {caseOpen && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
              {CASE_FIELDS.map((f) => (
                <View key={f.k} style={{ gap: 4 }}>
                  <T size={15} w={600} color={C.muted}>{L(f.bn, f.en)}</T>
                  <TextInput
                    multiline
                    value={d.case_notes[f.k] ?? ''}
                    onChangeText={(t) => draft.set((s) => ({ case_notes: { ...s.case_notes, [f.k]: t } }))}
                    style={{ minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.line, fontSize: fs(17), fontFamily: 'HindSiliguri_400Regular', color: C.ink, textAlignVertical: 'top' }}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </Screen>
    </View>
  );
}

function SmallBtn({ icon, label, onPress }: { icon: 'mic' | 'camera'; label: string; onPress: () => void }) {
  return (
    <Press haptic onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface }}>
      <Icon name={icon} size={20} />
      <T size={16} w={600}>{label}</T>
    </Press>
  );
}
