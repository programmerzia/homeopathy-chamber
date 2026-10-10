import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { draft } from '@/lib/draft';
import { dictate, useData } from '@/lib/hooks';
import { addAdvice, listAdvice } from '@/lib/repo';
import { save } from '@/lib/db';
import { L, n } from '@/lib/i18n';
import type { AdviceCat } from '@/lib/types';
import { Btn, Check, Chip, HScroll, Press, Row, Sheet, T, fs } from '@/ui/kit';
import { Icon } from '@/ui/Icon';
import { C } from '@/ui/theme';

const CATS: { v: AdviceCat; bn: string; en: string }[] = [
  { v: 'rule', bn: 'খাওয়ার নিয়ম', en: 'How to take' },
  { v: 'food', bn: 'খাবার', en: 'Food' },
  { v: 'storage', bn: 'ওষুধ রাখা', en: 'Storage' },
  { v: 'mine', bn: 'আমার লেখা', en: 'My own' },
];

export default function AdvicePicker() {
  const all = useData(listAdvice, [], ['advice']);
  const count = draft.get().meds.length;
  const [sel, setSel] = useState<string[]>(draft.get().advice);
  const [cat, setCat] = useState<AdviceCat | 'all'>('all');
  const [text, setText] = useState('');
  const [keepDefault, setKeepDefault] = useState(true);

  const shown = cat === 'all' ? all : all.filter((a) => a.cat === cat);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const done = () => {
    let ids = sel;
    if (text.trim()) ids = [...ids, addAdvice(text.trim(), keepDefault)];
    if (keepDefault) {
      // make this selection the default for future visits
      for (const a of all) {
        const want = ids.includes(a.id) ? 1 : 0;
        if (a.is_default !== want) save('advice', { id: a.id, is_default: want });
      }
    }
    draft.set({ advice: ids });
    router.back();
  };

  return (
    <Sheet
      label={L(`ধাপ ২ · ওষুধ (${n(count)})`, `Step 2 · Medicines (${count})`)}
      title={L('নিয়ম ও পরামর্শ', 'Rules & advice')}
      subtitle={L('যা টিক দেবেন, প্রেসক্রিপশনে ছাপা হবে', 'Ticked items are printed on the prescription')}
      footer={<Btn label={L(`ঠিক আছে (${n(sel.length + (text.trim() ? 1 : 0))}টি)`, `Done (${sel.length + (text.trim() ? 1 : 0)})`)} iconRight="check" onPress={done} />}
    >
      <HScroll>
        <Chip label={L('সব', 'All')} on={cat === 'all'} onPress={() => setCat('all')} />
        {CATS.map((c) => <Chip key={c.v} label={L(c.bn, c.en)} on={cat === c.v} onPress={() => setCat(c.v)} />)}
      </HScroll>

      <View>
        {shown.map((a, i) => {
          const on = sel.includes(a.id);
          return (
            <Press key={a.id} onPress={() => toggle(a.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 6, borderBottomWidth: i < shown.length - 1 ? 1 : 0, borderBottomColor: C.divider }}>
              <Check on={on} />
              <T size={17} style={{ flex: 1 }}>{L(a.text_bn, a.text_en)}</T>
            </Press>
          );
        })}
        {shown.length === 0 && <T color={C.muted} style={{ paddingVertical: 12 }}>{L('এখনো নিজের লেখা কিছু নেই — নিচে লিখুন', 'Nothing yet — write one below')}</T>}
      </View>

      <View style={{ gap: 8 }}>
        <T size={17} w={700}>{L('নিজে লিখুন', 'Write your own')}</T>
        <Row gap={8} style={{ alignItems: 'flex-start', paddingVertical: 12, paddingLeft: 14, paddingRight: 8, borderWidth: 1.5, borderColor: C.line, borderRadius: 14 }}>
          <TextInput multiline value={text} onChangeText={setText} placeholder={L('যেমন: রাতে দেরি করে ঘুমাবেন না', 'e.g. Do not stay up late')} placeholderTextColor={C.muted}
            style={{ flex: 1, minHeight: 52, fontSize: fs(17), lineHeight: fs(25), fontFamily: 'HindSiliguri_400Regular', color: C.ink, textAlignVertical: 'top', paddingVertical: 0 }} />
          <Press accessibilityLabel={L('মুখে বলুন', 'Dictate')} onPress={() => dictate((t) => setText((s) => (s ? `${s} ${t}` : t)))}
            style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="mic" size={20} color={C.primaryInk} />
          </Press>
        </Row>
      </View>

      <Press onPress={() => setKeepDefault(!keepDefault)} accessibilityRole="checkbox" accessibilityState={{ checked: keepDefault }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Check on={keepDefault} size={24} />
        <T size={16} style={{ flex: 1 }}>{L('এগুলো সব রোগীর জন্য সাধারণ রাখুন', 'Keep these as default for all patients')}</T>
      </Press>
    </Sheet>
  );
}
