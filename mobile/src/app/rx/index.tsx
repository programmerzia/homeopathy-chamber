import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useData, useDebounced } from '@/lib/hooks';
import { recentVisits } from '@/lib/repo';
import { L, longDate, n } from '@/lib/i18n';
import { Empty, Header, Press, SearchBox, T } from '@/ui/kit';
import { C } from '@/ui/theme';

export default function PastPrescriptions() {
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim(), 120);
  const all = useData(() => recentVisits(500), [], ['visits', 'patients']);
  const list = dq ? all.filter((v) => v.name.includes(dq) || v.meds.some((m) => m.name.toLowerCase().includes(dq.toLowerCase()))) : all;

  return (
    <View style={{ flex: 1 }}>
      <Header title={L('আগের প্রেসক্রিপশন', 'Past prescriptions')} />
      <View style={{ padding: 20, paddingBottom: 8 }}>
        <SearchBox value={q} onChangeText={setQ} placeholder={L('রোগী বা ওষুধের নাম', 'Patient or medicine')} h={54} />
      </View>
      <FlashList
        data={list}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        ListEmptyComponent={<Empty icon="printer" text={L('এখনো কোনো প্রেসক্রিপশন নেই', 'No prescriptions yet')} />}
        renderItem={({ item: v }) => (
          <Press onPress={() => router.push(`/rx/${v.id}`)} style={{ marginTop: 10, padding: 14, gap: 4, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T size={17} w={700} lines={1} style={{ flex: 1 }}>{v.name}</T>
              <T size={14} color={C.muted}>{longDate(v.date)}</T>
            </View>
            <T size={15} color={C.amberInk} w={600} lines={1}>
              {v.meds.map((m) => `${m.name} ${m.potency}`.trim()).join(', ') || L('ওষুধ নেই', 'No medicine')}
            </T>
            {!!v.complaint && <T size={14} color={C.muted} lines={1}>{v.complaint}</T>}
            <T size={13} color={C.muted}>{L(`আইডি ${n(v.code)}`, `ID ${v.code}`)}</T>
          </Press>
        )}
      />
    </View>
  );
}
