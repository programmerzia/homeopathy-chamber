import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { draft } from '@/lib/draft';
import { useStore, prefs } from '@/lib/store';
import { toast, useData, useDebounced } from '@/lib/hooks';
import { frequentMedicines, lastVisit, listAdvice, listTemplates, saveTemplate, searchMedicines } from '@/lib/repo';
import { addDays, dayDate, L, n, today } from '@/lib/i18n';
import { blankMed, doseLine, doseSub, formLabel, medFrom } from '@/lib/dose';
import type { MedItem } from '@/lib/types';
import { discardVisit } from '@/features/visit';
import { Btn, Chip, Footer, H2, Header, HScroll, Input, Press, Row, Screen, Steps, T, Tag, fs } from '@/ui/kit';
import { DatePickChip } from '@/ui/DatePick';
import { Icon } from '@/ui/Icon';
import { C } from '@/ui/theme';

export default function VisitMedicine() {
  const d = useStore(draft, (s) => s);
  const lang = prefs.get().lang;
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 80);
  const [tplName, setTplName] = useState<string | null>(null);
  const results = useData(() => (dq.trim() ? searchMedicines(dq, 'all', null, 8) : []), [dq], ['medicines']);
  const frequent = useData(() => frequentMedicines(5), [], ['medicines']);
  const templates = useData(listTemplates, [], ['templates']);
  const advice = useData(listAdvice, [], ['advice']);
  const prev = useData(() => lastVisit(d.patientId), [d.patientId], ['visits']);

  const add = (m: MedItem, openEditor = true) => {
    draft.set((s) => ({ meds: [...s.meds, m] }));
    setQ('');
    if (openEditor) router.push({ pathname: '/visit/dose', params: { key: m.key } });
  };
  const addCustom = () => add(blankMed(q.trim(), null, 'globule', '30C'));
  const repeatLast = () => {
    if (!prev) return;
    draft.set({ meds: prev.meds.map((m) => ({ ...m, key: Math.random().toString(36).slice(2) })), advice: prev.advice });
    toast(L('গতবারের ওষুধ যোগ হয়েছে', 'Last prescription copied'));
  };
  const applyTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id)!;
    draft.set((s) => ({ meds: [...s.meds, ...t.meds.map((m) => ({ ...m, key: Math.random().toString(36).slice(2) }))], advice: Array.from(new Set([...s.advice, ...t.advice])) }));
  };
  const setNext = (days: number | null, date?: string) => draft.set({ nextDays: days, nextDate: date ?? (days ? addDays(today(), days) : d.nextDate) });

  const selectedAdvice = advice.filter((a) => d.advice.includes(a.id));

  return (
    <View style={{ flex: 1 }}>
      <Header title={L('রোগী দেখা', 'Consultation')} right={<Press onPress={discardVisit} hitSlop={8}><Icon name="close" size={24} color={C.muted} /></Press>} />
      <Screen footer={<Footer><Btn label={L('পরের ধাপ: টাকা', 'Next: Payment')} iconRight="arrowRight" onPress={() => router.push('/visit/payment')} /></Footer>}>
        <Steps at={2} />

        <View style={{ gap: 0 }}>
          <Row gap={10} style={{ height: 56, paddingHorizontal: 16, backgroundColor: C.surface, borderWidth: 2, borderColor: C.primary, borderRadius: 16 }}>
            <Icon name="plus" size={22} color={C.primary} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={L('ওষুধ যোগ করুন — নাম লিখুন', 'Add medicine — type a name')}
              placeholderTextColor={C.muted}
              accessibilityLabel={L('ওষুধ খুঁজে যোগ করুন', 'Find and add medicine')}
              autoCorrect={false}
              style={{ flex: 1, fontSize: fs(17), fontFamily: 'HindSiliguri_400Regular', color: C.ink, paddingVertical: 0 }}
            />
          </Row>
          {!!q.trim() && (
            <View style={{ marginTop: 6, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
              {results.map((m) => (
                <Press key={m.id} onPress={() => add(medFrom(m))} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.divider }}>
                  <T size={17} w={700} style={{ flex: 1 }} lines={1}>{m.name}</T>
                  <T size={14} color={C.muted}>{m.potencies.slice(0, 3).join(' · ')}</T>
                  {m.stock === 'in' && <Tag tone="green" label={L('স্টকে', 'In stock')} />}
                  {m.stock === 'low' && <Tag tone="amber" label={L('কম', 'Low')} />}
                </Press>
              ))}
              <Press onPress={addCustom} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12 }}>
                <Icon name="plus" size={18} color={C.primary} />
                <T size={16} w={700} color={C.primary}>{L(`“${q.trim()}” নামে যোগ করুন`, `Add “${q.trim()}”`)}</T>
              </Press>
            </View>
          )}
        </View>

        {!q && (
          <HScroll style={{ marginTop: -6 }}>
            {prev && prev.meds.length > 0 && <Chip kind="soft" icon="refresh" label={L('গতবারের সব', 'Repeat last')} onPress={repeatLast} />}
            {templates.map((t) => <Chip key={t.id} icon="bookmark" label={t.name} onPress={() => applyTemplate(t.id)} />)}
            {frequent.map((m) => <Chip key={m.id} icon="plus" label={`${m.name.split(' ').slice(0, 2).join(' ')} ${medFrom(m).potency}`} onPress={() => add(medFrom(m), false)} />)}
          </HScroll>
        )}

        <View style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <H2>{L(`ওষুধ (${n(d.meds.length)})`, `Medicines (${d.meds.length})`)}</H2>
            {d.meds.length > 0 && tplName === null && (
              <Press onPress={() => setTplName('')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 36 }}>
                <Icon name="bookmark" size={18} color={C.primary} />
                <T size={15} w={700} color={C.primary}>{L('টেমপ্লেট সেভ', 'Save template')}</T>
              </Press>
            )}
          </Row>
          {tplName !== null && (
            <Row>
              <Input value={tplName} onChangeText={setTplName} autoFocus placeholder={L('টেমপ্লেটের নাম, যেমন: মাইগ্রেন', 'Template name')} style={{ flex: 1, height: 50, fontSize: fs(17) }} />
              <Btn h={50} size={16} label={L('সেভ', 'Save')} disabled={!tplName.trim()} onPress={() => {
                saveTemplate(tplName.trim(), d.meds, d.advice);
                setTplName(null);
                toast(L('টেমপ্লেট সেভ হয়েছে', 'Template saved'));
              }} />
            </Row>
          )}
          {d.meds.length === 0 ? (
            <View style={{ padding: 20, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line, alignItems: 'center' }}>
              <T size={16} color={C.muted} center>{L('উপরে ওষুধের নাম লিখে যোগ করুন', 'Type a medicine name above to add it')}</T>
            </View>
          ) : (
            <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, overflow: 'hidden' }}>
              {d.meds.map((m, i) => (
                <Press key={m.key} onPress={() => router.push({ pathname: '/visit/dose', params: { key: m.key } })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 14, paddingRight: 10, borderBottomWidth: i < d.meds.length - 1 ? 1 : 0, borderBottomColor: C.divider }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <T size={15} w={700} color="#FFFFFF" style={{ lineHeight: undefined }}>{n(i + 1)}</T>
                  </View>
                  <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                    <Row wrap>
                      <T size={18} w={700}>{m.name}</T>
                      {m.potency !== 'প্লাসিবো' && <T size={16} w={700} color={C.amberInk}>{m.potency}</T>}
                      <Tag label={formLabel(m.form, lang)} />
                    </Row>
                    <T size={16} color={C.body}>{doseLine(m, lang)}</T>
                    {m.hide ? (
                      <Row gap={4}><Icon name="eyeOff" size={16} color={C.amberInk} /><T size={14} w={600} color={C.amberInk}>{L('রোগীর কাগজে নাম দেখাবে না', 'Name hidden on patient copy')}</T></Row>
                    ) : !!doseSub(m, lang) && <T size={14} color={C.muted}>{doseSub(m, lang)}</T>}
                  </View>
                  <View accessibilityLabel={L('বদলান', 'Edit')} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="edit" size={20} color={C.primary} />
                  </View>
                </Press>
              ))}
            </View>
          )}
          {d.meds.length > 0 && <T size={14} color={C.muted}>{L('যেকোনো ওষুধে চাপ দিলে ডোজ বদলাতে পারবেন', 'Tap any medicine to change its dose')}</T>}
        </View>

        <Press onPress={() => router.push('/visit/advice')} style={{ gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T size={18} w={700}>{L('নিয়ম ও পরামর্শ', 'Rules & advice')}</T>
            <T size={15} w={700} color={C.primary}>{L('বদলান', 'Change')}</T>
          </Row>
          <Row wrap gap={6}>
            {selectedAdvice.length ? selectedAdvice.map((a) => <Tag key={a.id} tone="amber" label={L(a.short_bn || a.text_bn, a.short_en || a.text_en)} />) : <T size={15} color={C.muted}>{L('কিছু বাছা হয়নি', 'None selected')}</T>}
          </Row>
        </Press>

        <View style={{ gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <T size={18} w={700}>{L('আবার আসবেন', 'Next visit')}</T>
            <T size={16} w={600}>{d.nextDate ? dayDate(d.nextDate) : L('দরকার হলে', 'If needed')}</T>
          </Row>
          <Row wrap>
            {[7, 15, 30].map((days) => (
              <Chip key={days} label={days === 30 ? L('১ মাস', '1 month') : L(`${n(days)} দিন`, `${days} days`)} on={d.nextDays === days} onPress={() => setNext(days)} />
            ))}
            <DatePickChip label={L('তারিখ বাছুন', 'Pick date')} value={d.nextDate} on={d.nextDays === null && !!d.nextDate} onChange={(date) => setNext(null, date)} />
            <Chip label={L('দরকার নেই', 'None')} on={!d.nextDate} onPress={() => draft.set({ nextDays: null, nextDate: null })} />
          </Row>
        </View>
      </Screen>
    </View>
  );
}
