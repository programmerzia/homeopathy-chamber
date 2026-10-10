import { memo, useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dictate, useData, useDebounced } from '@/lib/hooks';
import { patientCount, searchPatients, topDiseases, type PatientFilter } from '@/lib/repo';
import { count, L, money, n, shortDate } from '@/lib/i18n';
import type { Patient } from '@/lib/types';
import { Avatar, Chip, Empty, H1, HScroll, Press, Row, SearchBox, T, Tag } from '@/ui/kit';
import { Icon } from '@/ui/Icon';
import { C } from '@/ui/theme';

export default function Patients() {
  const params = useLocalSearchParams<{ q?: string; focus?: string; filter?: PatientFilter }>();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState(params.q ?? '');
  const [filter, setFilter] = useState<PatientFilter>(params.filter ?? 'all');
  const [disease, setDisease] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  // deep-link params from Home shortcuts (derived state, applied when they change)
  const paramKey = `${params.q}|${params.filter}`;
  const [seenKey, setSeenKey] = useState(paramKey);
  if (seenKey !== paramKey) {
    setSeenKey(paramKey);
    if (params.q !== undefined) setQ(params.q);
    if (params.filter) setFilter(params.filter);
  }
  useEffect(() => {
    if (params.focus !== '1') return;
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [params.focus]);

  const dq = useDebounced(q, 120);
  const total = useData(patientCount, [], ['patients']);
  const diseases = useData(() => topDiseases(8), [], ['patients', 'diseases']);
  const list = useData(() => searchPatients(dq, filter, disease), [dq, filter, disease], ['patients', 'queue']);

  const filters: { v: PatientFilter; label: string }[] = [
    { v: 'all', label: L('সব', 'All') },
    { v: 'today', label: L('আজকের', 'Today') },
    { v: 'overdue', label: L('তারিখ পার হয়েছে', 'Overdue') },
    { v: 'due', label: L('টাকা বাকি', 'Money due') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top + 26, paddingHorizontal: 20, gap: 18, paddingBottom: 12 }}>
        <View>
          <H1>{L('রোগী', 'Patients')}</H1>
          <T size={16} color={C.muted}>{L(`মোট ${count(total)} জন`, `${count(total)} in total`)}</T>
        </View>
        <SearchBox inputRef={inputRef} value={q} onChangeText={setQ} placeholder={L('নাম, মোবাইল বা রোগ লিখুন', 'Name, mobile or disease')} onMic={() => dictate(setQ)} />
        <HScroll>
          {filters.map((f) => (
            <Chip key={f.v} big label={f.label} on={filter === f.v} onPress={() => setFilter(f.v)} />
          ))}
        </HScroll>
        <View style={{ gap: 8 }}>
          <T size={15} w={600} color={C.muted}>{L('রোগ দিয়ে খুঁজুন', 'Search by disease')}</T>
          <HScroll>
            {diseases.map((d) => (
              <Chip key={d} label={d} kind={disease === d ? 'amber' : 'default'} on={disease === d} onPress={() => setDisease(disease === d ? null : d)} />
            ))}
          </HScroll>
        </View>
      </View>
      <FlashList
        data={list}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        renderItem={({ item, index }) => <PatientRow p={item} first={index === 0} last={index === list.length - 1} />}
        ListEmptyComponent={<Empty icon="users" text={q ? L('এই নামে কাউকে পাওয়া যায়নি', 'No patient found') : L('এখানে কেউ নেই', 'Nobody here yet')} />}
        ListFooterComponent={
          <Press
            onPress={() => router.push({ pathname: '/patient/new', params: q && !/\d{5,}/.test(q) ? { name: q } : q ? { phone: q } : {} })}
            style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.dashed }}
          >
            <Icon name="userPlus" size={22} color={C.primary} />
            <T size={17} w={700} color={C.primary}>{L('নতুন রোগী যোগ করুন', 'Add new patient')}</T>
          </Press>
        }
      />
    </View>
  );
}

const PatientRow = memo(function PatientRow({ p, first, last }: { p: Patient; first: boolean; last: boolean }) {
  return (
    <Press
      onPress={() => router.push(`/patient/${p.id}`)}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: C.surface,
        borderColor: C.border, borderLeftWidth: 1, borderRightWidth: 1,
        borderTopWidth: first ? 1 : 0, borderBottomWidth: 1, borderBottomColor: last ? C.border : C.divider,
        borderTopLeftRadius: first ? 16 : 0, borderTopRightRadius: first ? 16 : 0,
        borderBottomLeftRadius: last ? 16 : 0, borderBottomRightRadius: last ? 16 : 0,
      }}
    >
      <Avatar name={p.name} />
      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        <T size={18} w={700} lines={1}>
          {p.name}
          {p.age != null && <T size={15} color={C.muted}> · {n(p.age)}</T>}
        </T>
        {p.diseases.length > 0 && (
          <Row gap={6} style={{ overflow: 'hidden' }}>
            {p.diseases.slice(0, 2).map((d) => <Tag key={d} label={d} />)}
          </Row>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        {p.last_visit && <T size={14} color={C.muted}>{shortDate(p.last_visit)}</T>}
        {p.due > 0 ? (
          <Tag tone="danger" label={L(`বাকি ${money(p.due)}`, `Due ${money(p.due)}`)} />
        ) : p.last_medicine ? (
          <T size={14} w={600} color={C.amberInk} lines={1}>{p.last_medicine}</T>
        ) : (
          <T size={14} w={600} color={C.amberInk}>{L('নতুন', 'New')}</T>
        )}
      </View>
    </Press>
  );
});
