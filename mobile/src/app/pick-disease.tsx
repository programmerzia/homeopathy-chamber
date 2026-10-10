import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { addDisease, getPatient, listDiseases, savePatient } from '@/lib/repo';
import { pickStore } from '@/lib/pick';
import { draft } from '@/lib/draft';
import { useData } from '@/lib/hooks';
import { L, n } from '@/lib/i18n';
import { Btn, Chip, Row, SearchBox, Sheet, T } from '@/ui/kit';
import { C } from '@/ui/theme';

/** Multi-select disease picker. key = 'form' (new-patient form) | 'draft' (visit) | a patient id. */
export default function PickDisease() {
  const { key = 'form' } = useLocalSearchParams<{ key?: string }>();
  const initial = key === 'form' ? pickStore.get().formDiseases : key === 'draft' ? draft.get().diseases : getPatient(key)?.diseases ?? [];
  const [sel, setSel] = useState<string[]>(initial);
  const [q, setQ] = useState('');
  const all = useData(listDiseases, [], ['diseases']);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? all.filter((d) => d.name_bn.includes(q.trim()) || d.name_en.toLowerCase().includes(t)) : all;
  }, [all, q]);
  const exact = all.some((d) => d.name_bn === q.trim() || d.name_en.toLowerCase() === q.trim().toLowerCase());

  const toggle = (name: string) => setSel((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));
  const done = () => {
    if (key === 'form') pickStore.set({ formDiseases: sel });
    else if (key === 'draft') draft.set({ diseases: sel });
    else {
      const p = getPatient(key);
      if (p) savePatient({ id: p.id, name: p.name, diseases: sel });
    }
    router.back();
  };

  return (
    <Sheet
      title={L('রোগ বাছুন', 'Pick diseases')}
      subtitle={L('একাধিক বাছতে পারেন', 'You can pick several')}
      footer={<Btn label={L(`ঠিক আছে (${n(sel.length)}টি)`, `Done (${sel.length})`)} iconRight="check" onPress={done} />}
    >
      <SearchBox value={q} onChangeText={setQ} placeholder={L('রোগের নাম লিখুন…', 'Type a disease…')} h={52} />
      {sel.length > 0 && (
        <Row wrap>
          {sel.map((d) => <Chip key={d} big kind="amber" label={`${d} ✓`} onPress={() => toggle(d)} />)}
        </Row>
      )}
      {!!q.trim() && !exact && (
        <Chip
          big
          kind="dashed"
          label={L(`+ “${q.trim()}” নতুন রোগ যোগ করুন`, `+ Add “${q.trim()}”`)}
          onPress={() => {
            addDisease(q.trim());
            toggle(q.trim());
            setQ('');
          }}
        />
      )}
      <Row wrap>
        {shown.filter((d) => !sel.includes(d.name_bn)).map((d) => (
          <Chip key={d.id} label={d.name_bn} onPress={() => toggle(d.name_bn)} />
        ))}
      </Row>
      {shown.length === 0 && !q && <T color={C.muted}>{L('কোনো রোগ নেই', 'No diseases')}</T>}
    </Sheet>
  );
}
