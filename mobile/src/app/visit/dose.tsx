import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { draft, removeMed, updateMed } from '@/lib/draft';
import { prefs, useStore } from '@/lib/store';
import { getMedicine } from '@/lib/repo';
import {
  applySignature, DEFAULT_SIGS, doseSignature, FORMS, qtyOptions, qtyText, rxLine, signatureLabel, SLOT_ORDER, slotLabel, slotsForTimes, TIMINGS, totalUnits,
} from '@/lib/dose';
import { L, n, toEnDigits } from '@/lib/i18n';
import type { Form, Slot } from '@/lib/types';
import { Btn, Check, Chip, Input, Press, Row, Sheet, T, Toggle, HScroll } from '@/ui/kit';
import { Icon, type IconName } from '@/ui/Icon';
import { C } from '@/ui/theme';

const STD_POTENCIES = ['6X', '30C', '200C', '1M', '10M', 'LM'];

export default function DoseEditor() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const count = useStore(draft, (d) => d.meds.length);
  const m = useStore(draft, (d) => d.meds.find((x) => x.key === key));
  const lang = prefs.get().lang;
  const [customQty, setCustomQty] = useState(false);
  const [customPot, setCustomPot] = useState(false);
  if (!m) return null;

  const med = m.medicine_id ? getMedicine(m.medicine_id) : null;
  const set = (patch: Partial<typeof m>) => updateMed(m.key, patch);
  const sigs = med && Object.keys(med.doses).length
    ? Object.entries(med.doses).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s)
    : DEFAULT_SIGS;
  const sig = doseSignature(m);
  const potencies = Array.from(new Set([...(med?.potencies ?? []), ...(m.form === 'mother' ? ['Q'] : STD_POTENCIES), m.potency].filter(Boolean)));
  const qtys = qtyOptions(m.form);
  const total = totalUnits(m);

  const setTimes = (t: number) => set({ times: t, slots: slotsForTimes(t) });
  const toggleSlot = (s: Slot) => {
    const slots = m.slots.includes(s) ? m.slots.filter((x) => x !== s) : SLOT_ORDER.filter((x) => x === s || m.slots.includes(x));
    set({ slots, times: slots.length || m.times });
  };
  const setForm = (f: Form) => {
    const opts = qtyOptions(f);
    set({ form: f, qty: opts.includes(m.qty) ? m.qty : opts[Math.min(1, opts.length - 1)] ?? 0, water: f === 'mother' || f === 'drop' ? m.water : false });
  };

  return (
    <Sheet
      label={L(`ধাপ ২ · ওষুধ (${n(count)})`, `Step 2 · Medicines (${count})`)}
      title={<T serif size={28} style={{ lineHeight: 34 }}>{m.name || L('ওষুধ', 'Medicine')}</T>}
      subtitle={med?.stock === 'in' || med?.stock === 'low' ? L(`স্টকে আছে: ${med.potencies.join(', ')}`, `In stock: ${med.potencies.join(', ')}`) : med?.grp || undefined}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn style={{ flex: 1 }} kind="danger" size={17} label={L('মুছুন', 'Remove')} onPress={() => { removeMed(m.key); router.back(); }} />
          <Btn style={{ flex: 2 }} label={L('ঠিক আছে', 'Done')} iconRight="check" onPress={() => router.back()} />
        </View>
      }
    >
      <View style={{ gap: 8 }}>
        <T size={15} w={700} color={C.primaryInk}>{L('এক চাপে ডোজ (আপনার বেশি ব্যবহৃত)', 'One-tap dose (your most used)')}</T>
        <HScroll>
          {sigs.map((s) => {
            const on = s === sig;
            return (
              <Press key={s} haptic accessibilityState={{ selected: on }} onPress={() => updateMed(m.key, applySignature(m, s))}
                style={{ height: 44, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', borderWidth: on ? 2 : 1.5, borderStyle: on ? 'solid' : 'dashed', borderColor: on ? C.primary : C.dashed, backgroundColor: on ? C.primarySoft : C.surface }}>
                <T size={15} w={on ? 700 : 500} color={on ? C.primaryInk : C.ink}>{signatureLabel(s, lang)}</T>
              </Press>
            );
          })}
        </HScroll>
      </View>

      <Section title={L('শক্তি', 'Potency')}>
        <Row wrap>
          {potencies.map((p) => <Chip key={p} label={p} on={m.potency === p} onPress={() => set({ potency: p })} />)}
          <Chip kind="dashed" label={L('অন্য', 'Other')} onPress={() => setCustomPot(true)} />
        </Row>
        {customPot && <Input autoFocus value={m.potency} onChangeText={(t) => set({ potency: t.toUpperCase() })} placeholder="50M / LM3 / 3X" autoCapitalize="characters" style={{ height: 50 }} />}
      </Section>

      <Section title={L('ধরন', 'Form')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FORMS.map((f) => {
            const on = m.form === f.key;
            return (
              <Press key={f.key} haptic accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setForm(f.key)}
                style={{ width: '23%', height: 70, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: on ? C.primary : C.surface, borderWidth: on ? 0 : 1.5, borderColor: C.track }}>
                <Icon name={f.icon as IconName} size={22} color={on ? '#FFFFFF' : C.ink} />
                <T size={14} w={on ? 700 : 500} color={on ? '#FFFFFF' : C.ink} center style={{ lineHeight: 17 }}>{lang === 'bn' ? f.bn : f.en}</T>
              </Press>
            );
          })}
        </View>
      </Section>

      {m.form !== 'ointment' && (
        <Section title={L('প্রতিবার কতটুকু?', 'How much each time?')}>
          <Row wrap>
            {qtys.map((q) => <Chip key={q} label={qtyText({ qty: q, form: m.form }, lang)} on={m.qty === q && !customQty} onPress={() => { setCustomQty(false); set({ qty: q }); }} />)}
            <Chip kind={customQty ? 'sel' : 'dashed'} label={L('অন্য', 'Other')} onPress={() => setCustomQty(true)} />
          </Row>
          {customQty && <Input autoFocus keyboardType="number-pad" value={n(m.qty)} onChangeText={(t) => set({ qty: parseInt(toEnDigits(t), 10) || 0 })} style={{ height: 50 }} />}
          {(m.form === 'mother' || m.form === 'drop' || m.form === 'globule') && (
            <Press onPress={() => set({ water: !m.water })} accessibilityRole="checkbox" accessibilityState={{ checked: m.water }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Check on={m.water} size={24} />
              <T size={16}>{L('পানিতে গুলে খাবে (আধা কাপ)', 'Dissolve in water (half cup)')}</T>
            </Press>
          )}
        </Section>
      )}

      <Section title={L('দিনে কতবার?', 'How often?')}>
        <Row wrap>
          {[1, 2, 3, 4].map((t) => <Chip key={t} label={L(`${n(t)} বার`, `${t}×`)} on={m.times === t} onPress={() => setTimes(t)} />)}
          <Chip label={L('একবারই', 'Single dose')} on={m.times === 0} onPress={() => set({ times: 0, slots: [], days: 1 })} />
          <Chip label={L('প্রয়োজনে', 'When needed')} on={m.times === -1} onPress={() => set({ times: -1, slots: [] })} />
        </Row>
        {m.times > 0 && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {SLOT_ORDER.map((s) => {
              const on = m.slots.includes(s);
              return (
                <Press key={s} haptic accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggleSlot(s)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 12, backgroundColor: on ? C.primarySoft : C.surface, borderWidth: on ? 0 : 1.5, borderColor: C.track }}>
                  <Icon name={s} size={20} color={on ? C.primaryInk : C.muted} />
                  <T size={16} w={on ? 700 : 500} color={on ? C.primaryInk : C.muted}>{slotLabel(s, lang)}</T>
                </Press>
              );
            })}
          </View>
        )}
      </Section>

      <Section title={L('কখন খাবে?', 'When to take?')}>
        <Row wrap>
          {TIMINGS.map((t) => <Chip key={t.key} label={lang === 'bn' ? t.bn : t.en} on={m.timing === t.key} onPress={() => set({ timing: m.timing === t.key ? '' : t.key })} />)}
        </Row>
      </Section>

      {m.times !== 0 && (
        <Section title={L('কত দিন?', 'For how long?')}>
          <Row wrap>
            {[3, 7, 15, 30].map((dd) => <Chip key={dd} label={L(`${n(dd)} দিন`, `${dd} days`)} on={m.days === dd} onPress={() => set({ days: dd })} />)}
            <Chip label={L('শেষ হওয়া পর্যন্ত', 'Until finished')} on={m.days === 0} onPress={() => set({ days: 0 })} />
          </Row>
        </Section>
      )}

      <Row gap={12} style={{ paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.bg, borderRadius: 14 }}>
        <Icon name="eyeOff" size={22} color={C.muted} />
        <View style={{ flex: 1 }}>
          <T size={16} w={700}>{L('রোগীর কাগজে নাম লুকান', 'Hide name on patient copy')}</T>
          <T size={13} color={C.muted}>{L('কাগজে শুধু “ওষুধ ১” লেখা থাকবে', 'Paper shows only “Medicine 1”')}</T>
        </View>
        <Toggle value={m.hide} onChange={(v) => set({ hide: v })} label={L('নাম লুকান', 'Hide name')} />
      </Row>

      <View style={{ paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.amberSoft, borderRadius: 14 }}>
        <T size={16} color={C.amberDeep}>
          <T size={16} w={700} color={C.amberDeep}>{m.name} {m.potency !== 'প্লাসিবো' ? m.potency : ''}</T> — {rxLine(m, lang)}
          {total ? <T size={16} w={700} color={C.amberDeep}>{L(` · মোট ${n(total)}টি`, ` · total ${total}`)}</T> : null}
        </T>
      </View>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <T size={17} w={700}>{title}</T>
      {children}
    </View>
  );
}
