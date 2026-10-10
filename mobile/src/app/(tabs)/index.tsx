import { View } from 'react-native';
import { router } from 'expo-router';
import { useData, dictate } from '@/lib/hooks';
import { getChamber, getPatient, homeCounts, lowStock, todayQueue } from '@/lib/repo';
import { beginVisit } from '@/lib/draft';
import { dayDate, L, n, today } from '@/lib/i18n';
import { prefs, useStore } from '@/lib/store';
import { Icon, type IconName } from '@/ui/Icon';
import { Btn, H2, ListCard, Press, Row, Screen, T, HScroll } from '@/ui/kit';
import { C } from '@/ui/theme';

export default function Home() {
  const chamber = useData(getChamber, [], ['settings']);
  const queue = useData(todayQueue, [], ['queue', 'patients']);
  const counts = useData(homeCounts, [], ['patients', 'medicines', 'visits']);
  const low = useData(lowStock, [], ['medicines']);
  const recentIds = useStore(prefs, (p) => p.recent);
  const recent = useData(() => recentIds.map(getPatient).filter((p) => p && !(p as any).deleted).slice(0, 3), [recentIds.join()], ['patients']);

  const waiting = queue.filter((q) => q.status === 'waiting');
  const seen = counts.seenToday;
  const next = waiting[0];
  const lang = prefs.get().lang;

  return (
    <Screen top>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <T size={15} color={C.muted}>{dayDate(today())}</T>
          <T size={22} w={700} lines={1}>{chamber.chamberName || L('[চেম্বারের নাম]', '[Chamber name]')}</T>
        </View>
        <Press
          haptic
          accessibilityRole="button"
          accessibilityLabel={L('ভাষা বদলান', 'Change language')}
          onPress={() => prefs.set({ lang: lang === 'bn' ? 'en' : 'bn' })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface }}
        >
          <Icon name="globe" size={20} sw={1.8} />
          <T size={15} w={600}>বাংলা / EN</T>
        </Press>
      </Row>

      <Press
        accessibilityRole="search"
        accessibilityLabel={L('রোগী খুঁজুন', 'Find patient')}
        onPress={() => router.navigate({ pathname: '/patients', params: { focus: '1' } })}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 60, paddingLeft: 16, paddingRight: 6, backgroundColor: C.surface, borderWidth: 2, borderColor: C.primary, borderRadius: 16 }}
      >
        <Icon name="search" size={22} sw={1.8} color={C.primary} />
        <T size={18} color={C.muted} style={{ flex: 1 }} lines={1}>{L('নাম, মোবাইল বা সিরিয়াল নম্বর', 'Name, mobile or serial no.')}</T>
        <Press
          haptic
          accessibilityLabel={L('মুখে বলে খুঁজুন', 'Search by voice')}
          onPress={() => dictate((text) => router.navigate({ pathname: '/patients', params: { q: text } }))}
          style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="mic" size={22} color={C.primaryInk} />
        </Press>
      </Press>

      {recent.length > 0 && (
        <HScroll style={{ marginTop: -6 }}>
          <T size={14} color={C.muted} style={{ alignSelf: 'center' }}>{L('সম্প্রতি:', 'Recent:')}</T>
          {recent.map((p) => (
            <Press key={p!.id} onPress={() => router.push(`/patient/${p!.id}`)} style={{ height: 38, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, justifyContent: 'center' }}>
              <T size={15} w={500}>{p!.name}</T>
            </Press>
          ))}
        </HScroll>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn style={{ flex: 1 }} h={64} size={18} icon="userPlus" label={L('নতুন রোগী', 'New patient')} onPress={() => router.push('/patient/new')} />
        <Btn style={{ flex: 1 }} h={64} size={18} kind="outline" icon="list" label={L('সিরিয়াল দিন', 'Add serial')} onPress={() => router.push({ pathname: '/pick-patient', params: { mode: 'queue' } })} />
      </View>

      <ListCard>
        {next ? (
          <View style={{ gap: 10, padding: 16, backgroundColor: C.primary }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T size={15} color={C.onPrimaryMuted}>{L('পরের রোগী', 'Next patient')}</T>
              <T size={14} color={C.onPrimaryMuted}>{L(`অপেক্ষায় ${n(waiting.length)} · দেখা হয়েছে ${n(seen)}`, `Waiting ${waiting.length} · Seen ${seen}`)}</T>
            </Row>
            <Row gap={12}>
              <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
                <T size={24} w={700} color={C.primary} style={{ lineHeight: undefined }}>{n(next.num)}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T size={21} w={700} color="#FFFFFF" lines={1}>{next.name}</T>
                <T size={15} color={C.onPrimaryMuted} lines={1}>
                  {[JSON.parse(next.diseases)[0], next.last_medicine ? L(`গতবার ${next.last_medicine}`, `Last: ${next.last_medicine}`) : L('নতুন রোগী', 'New patient')].filter(Boolean).join(' · ')}
                </T>
              </View>
            </Row>
            <Btn kind="white" h={52} size={18} label={L('রোগী দেখুন', 'See patient')} iconRight="arrowRight" onPress={() => beginVisit(next.patient_id)} style={{ borderRadius: 14 }} />
          </View>
        ) : (
          <View style={{ padding: 16, gap: 4, backgroundColor: C.primary }}>
            <T size={15} color={C.onPrimaryMuted}>{L('আজকের সিরিয়াল', "Today's serial")}</T>
            <T size={19} w={700} color="#FFFFFF">{seen ? L(`সবাইকে দেখা শেষ · ${n(seen)} জন`, `All done · ${seen} seen`) : L('এখনো কেউ সিরিয়ালে নেই', 'No one in the serial yet')}</T>
            <T size={15} color={C.onPrimaryMuted}>{L('“সিরিয়াল দিন” চাপলে রোগী এখানে আসবে', 'Tap “Add serial” to queue a patient')}</T>
          </View>
        )}
        {waiting.slice(1, 3).map((q) => (
          <Press key={q.id} onPress={() => beginVisit(q.patient_id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: C.divider }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <T size={16} w={700} color={C.primaryInk} style={{ lineHeight: undefined }}>{n(q.num)}</T>
            </View>
            <T size={17} w={600} style={{ flex: 1 }} lines={1}>{q.name}</T>
            <T size={14} color={C.muted}>{q.visit_count ? L('পুরনো', 'Returning') : L('নতুন রোগী', 'New')}</T>
          </Press>
        ))}
        {queue.length > 0 && (
          <Press onPress={() => router.push('/queue')} style={{ height: 48, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: C.divider }}>
            <T size={16} w={700} color={C.primary}>{L('পুরো সিরিয়াল দেখুন', 'Full serial list')}</T>
          </Press>
        )}
      </ListCard>

      <View style={{ gap: 12 }}>
        <H2>{L('শর্টকাট', 'Shortcuts')}</H2>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
          <Shortcut icon="calendar" label={L('আজকের\nফলো-আপ', "Today's\nfollow-ups")} badge={counts.followups} onPress={() => router.navigate({ pathname: '/patients', params: { filter: 'today' } })} />
          <Shortcut icon="camera" label={L('খাতার\nছবি', 'Khata\nphotos')} onPress={() => router.push('/khata')} />
          <Shortcut icon="medicine" label={L('ওষুধ\nখুঁজুন', 'Find\nmedicine')} onPress={() => router.push('/medicines')} />
          <Shortcut icon="wallet" label={L('বাকি\nআদায়', 'Collect\ndues')} badge={counts.dues} onPress={() => router.navigate({ pathname: '/patients', params: { filter: 'due' } })} />
          <Shortcut icon="message" label={L('SMS\nরিমাইন্ডার', 'SMS\nreminders')} onPress={() => router.push('/settings/sms')} />
          <Shortcut icon="users" label={L('রোগ দিয়ে\nখুঁজুন', 'Search by\ndisease')} onPress={() => router.navigate({ pathname: '/patients', params: { focus: 'disease' } })} />
          <Shortcut icon="printer" label={L('আগের\nপ্রেসক্রিপশন', 'Past\nprescriptions')} onPress={() => router.push('/rx')} />
          <Shortcut icon="store" label={L('ওষুধের\nস্টক', 'Medicine\nstock')} badge={counts.lowStock} warn onPress={() => router.push({ pathname: '/medicines', params: { tab: 'stock' } })} />
        </View>
      </View>

      {low.length > 0 && (
        <Press onPress={() => router.push({ pathname: '/medicines', params: { tab: 'stock' } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, backgroundColor: C.amberSoft, borderRadius: 16 }}>
          <Icon name="bell" size={22} color={C.amberInk} />
          <T size={16} w={600} color={C.amberInk} style={{ flex: 1 }}>
            {low.length === 1 ? L(`${low[0].name} কম আছে`, `${low[0].name} is running low`) : L(`${low[0].name} সহ ${n(low.length)}টি ওষুধ কম আছে`, `${low.length} medicines incl. ${low[0].name} are low`)}
          </T>
          <Icon name="chevronRight" size={22} color={C.amberInk} />
        </Press>
      )}
    </Screen>
  );
}

function Shortcut({ icon, label, badge, warn, onPress }: { icon: IconName; label: string; badge?: number; warn?: boolean; onPress: () => void }) {
  return (
    <Press haptic accessibilityRole="button" accessibilityLabel={label.replace('\n', ' ')} onPress={onPress} style={{ width: '25%', alignItems: 'center', gap: 6, paddingTop: 6 }}>
      <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={24} color={C.primary} />
      </View>
      <T size={14} w={600} center style={{ lineHeight: 18 }}>{label}</T>
      {!!badge && (
        <View style={{ position: 'absolute', top: 2, right: 10, minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: warn ? C.warnBadge : C.danger, alignItems: 'center', justifyContent: 'center' }}>
          <T size={13} w={700} color={warn ? C.warnBadgeInk : '#FFFFFF'} style={{ lineHeight: undefined }}>{n(badge)}</T>
        </View>
      )}
    </Press>
  );
}
