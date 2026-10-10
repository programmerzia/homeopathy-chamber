import { View } from 'react-native';
import { router } from 'expo-router';
import { useData } from '@/lib/hooks';
import { setQueueStatus, todayQueue } from '@/lib/repo';
import { beginVisit } from '@/lib/draft';
import { dayDate, L, n, today } from '@/lib/i18n';
import { Btn, Empty, Header, Press, Row, Screen, T, Tag } from '@/ui/kit';
import { Icon } from '@/ui/Icon';
import { C } from '@/ui/theme';

export default function Queue() {
  const queue = useData(todayQueue, [], ['queue', 'patients']);
  const waiting = queue.filter((q) => q.status === 'waiting');
  const done = queue.filter((q) => q.status !== 'waiting');

  return (
    <View style={{ flex: 1 }}>
      <Header title={L('আজকের সিরিয়াল', "Today's serial")} />
      <Screen footer={<View style={{ padding: 20, paddingBottom: 28, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border }}><Btn icon="list" label={L('সিরিয়াল দিন', 'Add serial')} onPress={() => router.push({ pathname: '/pick-patient', params: { mode: 'queue' } })} /></View>}>
        <T size={15} color={C.muted}>{dayDate(today())} · {L(`অপেক্ষায় ${n(waiting.length)} · দেখা হয়েছে ${n(done.length)}`, `Waiting ${waiting.length} · Done ${done.length}`)}</T>
        {queue.length === 0 && <Empty icon="list" text={L('আজ এখনো কেউ সিরিয়ালে নেই', 'Nobody in the serial today')} />}
        {[...waiting, ...done].map((q) => {
          const isWaiting = q.status === 'waiting';
          return (
            <Row key={q.id} gap={12} style={{ padding: 12, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, opacity: isWaiting ? 1 : 0.6 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isWaiting ? C.primary : C.divider, alignItems: 'center', justifyContent: 'center' }}>
                <T size={18} w={700} color={isWaiting ? '#FFFFFF' : C.muted} style={{ lineHeight: undefined }}>{n(q.num)}</T>
              </View>
              <Press style={{ flex: 1 }} onPress={() => router.push(`/patient/${q.patient_id}`)}>
                <T size={17} w={700} lines={1}>{q.name}</T>
                <T size={14} color={C.muted}>{q.visit_count ? L('পুরনো রোগী', 'Returning') : L('নতুন রোগী', 'New patient')}</T>
              </Press>
              {isWaiting ? (
                <>
                  <Press accessibilityLabel={L('সিরিয়াল থেকে সরান', 'Remove from serial')} onPress={() => setQueueStatus(q.id, 'skipped')} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="close" size={20} color={C.muted} />
                  </Press>
                  <Btn h={44} size={16} label={L('দেখুন', 'See')} onPress={() => beginVisit(q.patient_id)} />
                </>
              ) : (
                <Tag tone={q.status === 'seen' ? 'green' : 'neutral'} label={q.status === 'seen' ? L('দেখা হয়েছে', 'Seen') : L('চলে গেছেন', 'Left')} />
              )}
            </Row>
          );
        })}
      </Screen>
    </View>
  );
}
