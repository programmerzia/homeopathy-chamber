import { View } from 'react-native';
import { router } from 'expo-router';
import { draft } from '@/lib/draft';
import { confirm } from '@/lib/hooks';
import { getPatient, lastVisit } from '@/lib/repo';
import { L, n, shortDate } from '@/lib/i18n';
import { Avatar, Row, T } from '@/ui/kit';
import { C } from '@/ui/theme';

export function VisitPatientCard({ pid }: { pid: string }) {
  const p = getPatient(pid);
  const lv = lastVisit(pid);
  if (!p) return null;
  const last = lv?.meds[0] ? `${lv.meds[0].name} ${lv.meds[0].potency}`.trim() : null;
  return (
    <Row gap={12} style={{ paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16 }}>
      <Avatar name={p.name} size={44} dark />
      <View style={{ flex: 1 }}>
        <T size={18} w={700} lines={1}>{p.name}{p.age != null ? ` · ${n(p.age)}` : ''}</T>
        <T size={15} color={C.muted} lines={1}>
          {lv ? L(`গতবার: ${last ?? '—'} · ${shortDate(lv.date)}`, `Last: ${last ?? '—'} · ${shortDate(lv.date)}`) : L('প্রথমবার দেখা হচ্ছে', 'First visit')}
        </T>
      </View>
    </Row>
  );
}

export async function discardVisit() {
  const d = draft.get();
  const dirty = d.complaint || d.meds.length || d.status;
  if (!dirty || (await confirm(L('ভিজিট বাতিল করবেন?', 'Discard this visit?'), L('লেখা তথ্য সেভ হবে না।', 'Nothing will be saved.'), L('বাতিল', 'Discard')))) {
    router.dismissAll();
  }
}

