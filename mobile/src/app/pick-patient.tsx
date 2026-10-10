import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { addToQueue, searchPatients, todayQueue } from '@/lib/repo';
import { beginVisit } from '@/lib/draft';
import { pickStore } from '@/lib/pick';
import { dictate, toast, useData, useDebounced } from '@/lib/hooks';
import { L, n, prettyPhone } from '@/lib/i18n';
import type { Patient } from '@/lib/types';
import { Avatar, Btn, Press, SearchBox, Sheet, T } from '@/ui/kit';
import { C } from '@/ui/theme';

type Mode = 'visit' | 'queue' | 'khata';

/** Find a patient, then: start a visit, add to today's serial, or choose for a khata photo. */
export default function PickPatient() {
  const { mode = 'visit' } = useLocalSearchParams<{ mode?: Mode }>();
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 100);
  const results = useData(() => searchPatients(dq, 'all', null, 40), [dq], ['patients']);
  const waiting = useData(() => todayQueue().filter((x) => x.status === 'waiting'), [], ['queue']);

  const choose = (id: string) => {
    if (mode === 'queue') {
      const num = addToQueue(id);
      toast(L(`সিরিয়াল নম্বর ${n(num)} দেওয়া হলো`, `Serial no. ${num} given`));
      router.back();
    } else if (mode === 'khata') {
      pickStore.set({ khataPid: id });
      router.back();
    } else {
      router.back();
      beginVisit(id);
    }
  };

  const title = mode === 'queue' ? L('সিরিয়াল দিন', 'Add to serial') : mode === 'khata' ? L('কোন রোগীর খাতা?', "Whose notebook?") : L('কোন রোগী দেখবেন?', 'Which patient?');

  return (
    <Sheet
      title={title}
      footer={
        <Btn kind="outline" icon="userPlus" label={L('নতুন রোগী', 'New patient')} onPress={() => {
          router.back();
          router.push({ pathname: '/patient/new', params: /^\d+$/.test(q) ? { phone: q } : q ? { name: q } : {} });
        }} />
      }
    >
      <SearchBox value={q} onChangeText={setQ} autoFocus={mode !== 'visit' || waiting.length === 0} placeholder={L('নাম, মোবাইল বা সিরিয়াল নম্বর', 'Name, mobile or serial no.')} onMic={() => dictate(setQ)} />
      {mode === 'visit' && !q && waiting.length > 0 && (
        <View style={{ gap: 8 }}>
          <T size={15} w={700} color={C.primaryInk}>{L('সিরিয়ালে অপেক্ষায়', 'Waiting in serial')}</T>
          {waiting.map((w) => (
            <Press key={w.id} onPress={() => choose(w.patient_id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: C.primarySoft }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}>
                <T size={16} w={700} color="#FFFFFF" style={{ lineHeight: undefined }}>{n(w.num)}</T>
              </View>
              <T size={17} w={600} style={{ flex: 1 }}>{w.name}</T>
            </Press>
          ))}
        </View>
      )}
      <View>
        {results.map((p) => <Result key={p.id} p={p} onPress={() => choose(p.id)} />)}
        {results.length === 0 && <T color={C.muted} center style={{ paddingVertical: 20 }}>{L('কাউকে পাওয়া যায়নি — নতুন রোগী যোগ করুন', 'No match — add a new patient')}</T>}
      </View>
    </Sheet>
  );
}

function Result({ p, onPress }: { p: Patient; onPress: () => void }) {
  return (
    <Press onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.divider }}>
      <Avatar name={p.name} size={42} />
      <View style={{ flex: 1 }}>
        <T size={17} w={700} lines={1}>{p.name}{p.age != null ? <T size={15} color={C.muted}> · {n(p.age)}</T> : null}</T>
        <T size={14} color={C.muted}>{n(prettyPhone(p.phone))}{p.diseases[0] ? ` · ${p.diseases[0]}` : ''}</T>
      </View>
    </Press>
  );
}
