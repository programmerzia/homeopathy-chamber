import { memo, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useData, useDebounced } from '@/lib/hooks';
import { medicineCount, searchMedicines } from '@/lib/repo';
import { formLabel } from '@/lib/dose';
import { count, L } from '@/lib/i18n';
import { prefs } from '@/lib/store';
import type { Medicine } from '@/lib/types';
import { Chip, Empty, Header, HScroll, Press, SearchBox, Segmented, T, Tag } from '@/ui/kit';
import { Icon } from '@/ui/Icon';
import { C } from '@/ui/theme';

type Tab = 'all' | 'stock' | 'used';
const FORM_FILTERS: { v: string | null; bn: string; en: string }[] = [
  { v: null, bn: 'সব ধরন', en: 'All forms' },
  { v: 'globule', bn: 'বড়ি', en: 'Globules' },
  { v: 'tablet', bn: 'ট্যাবলেট', en: 'Tablets' },
  { v: 'drop,mother,lm', bn: 'ফোঁটা / Q', en: 'Drops / Q' },
  { v: 'syrup', bn: 'সিরাপ', en: 'Syrup' },
  { v: 'powder', bn: 'পুরিয়া', en: 'Powder' },
  { v: 'ointment', bn: 'মলম', en: 'Ointment' },
];

export default function Medicines() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>(params.tab ?? 'all');
  const [form, setForm] = useState<string | null>(null);
  const dq = useDebounced(q, 100);
  const total = useData(medicineCount, [], ['medicines']);
  const list = useData(() => searchMedicines(dq, tab, form), [dq, tab, form], ['medicines']);

  return (
    <View style={{ flex: 1 }}>
      <Header title={L('ওষুধের তালিকা', 'Medicines')} />
      <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 14, paddingBottom: 8 }}>
        <T size={16} color={C.muted}>{L(`${count(total)}টি ওষুধ আগে থেকেই দেওয়া · নিজেও যোগ করা যায়`, `${count(total)} medicines included · add your own`)}</T>
        <SearchBox value={q} onChangeText={setQ} h={56} placeholder={L('ওষুধের নাম (যেমন: Arnica)', 'Medicine name (e.g. Arnica)')} />
        <Segmented<Tab> h={46} options={[{ v: 'all', label: L('সব ওষুধ', 'All') }, { v: 'stock', label: L('আমার স্টক', 'My stock') }, { v: 'used', label: L('বেশি দেওয়া', 'Most used') }]} value={tab} onChange={setTab} />
        <HScroll>
          {FORM_FILTERS.map((f) => <Chip key={String(f.v)} label={L(f.bn, f.en)} on={form === f.v} onPress={() => setForm(f.v)} />)}
        </HScroll>
      </View>
      <FlashList
        data={list}
        keyExtractor={(m) => m.id}
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 4 }}
        renderItem={({ item, index }) => <MedRow m={item} first={index === 0} last={index === list.length - 1} />}
        ListEmptyComponent={<Empty icon="medicine" text={tab === 'stock' ? L('স্টকে কিছু চিহ্নিত নেই — ওষুধে চাপ দিয়ে স্টক দিন', 'Nothing marked in stock — tap a medicine to set stock') : L('কিছু পাওয়া যায়নি', 'Nothing found')} />}
        ListFooterComponent={
          <Press onPress={() => router.push({ pathname: '/medicine-edit', params: q ? { name: q } : {} })} style={{ marginTop: 18, minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.dashed }}>
            <Icon name="plus" size={20} color={C.primary} />
            <T size={17} w={700} color={C.primary}>{L('নিজের ওষুধ / পেটেন্ট যোগ করুন', 'Add your own / patent medicine')}</T>
          </Press>
        }
      />
    </View>
  );
}

const STOCK = { in: ['green', 'স্টকে', 'In stock'], low: ['amber', 'কম আছে', 'Low'], out: ['neutral', 'নেই', 'Out'] } as const;

const MedRow = memo(function MedRow({ m, first, last }: { m: Medicine; first: boolean; last: boolean }) {
  const lang = prefs.get().lang;
  const st = m.stock ? STOCK[m.stock] : null;
  return (
    <Press
      onPress={() => router.push({ pathname: '/medicine-edit', params: { id: m.id } })}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.surface,
        borderColor: C.border, borderLeftWidth: 1, borderRightWidth: 1, borderTopWidth: first ? 1 : 0, borderBottomWidth: 1, borderBottomColor: last ? C.border : C.divider,
        borderTopLeftRadius: first ? 16 : 0, borderTopRightRadius: first ? 16 : 0, borderBottomLeftRadius: last ? 16 : 0, borderBottomRightRadius: last ? 16 : 0,
      }}
    >
      <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
        <T serif size={19} lines={1}>{m.name}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {m.potencies.slice(0, 4).map((p) => (
            <View key={p} style={{ paddingHorizontal: 8, paddingVertical: 1, borderRadius: 6, borderWidth: 1, borderColor: C.track }}>
              <T size={14} w={600} color={C.body}>{p}</T>
            </View>
          ))}
          <T size={14} color={C.muted}>{[m.forms.map((f) => formLabel(f, lang)).join(', '), m.grp].filter(Boolean).join(' · ')}</T>
        </View>
      </View>
      {st && <Tag tone={st[0]} label={L(st[1], st[2])} />}
    </Press>
  );
});
