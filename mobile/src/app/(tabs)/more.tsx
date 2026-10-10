import { Linking, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useData, toast } from '@/lib/hooks';
import { medicineCount } from '@/lib/repo';
import { exportExcel } from '@/lib/export';
import { prefs, setLanding, useStore } from '@/lib/store';
import { syncNow, syncState } from '@/lib/sync';
import { lockState } from '@/lib/lock';
import { ago, count, L } from '@/lib/i18n';
import { H1, Press, Row, Screen, Segmented, T } from '@/ui/kit';
import { Icon, type IconName } from '@/ui/Icon';
import { C } from '@/ui/theme';

const SUPPORT = process.env.EXPO_PUBLIC_SUPPORT_PHONE ?? '';

export default function More() {
  const p = useStore(prefs, (s) => s);
  const sync = useStore(syncState, (s) => s);
  const lockOn = useStore(lockState, (s) => s.enabled);
  const meds = useData(medicineCount, [], ['medicines']);
  const connected = !!p.token;

  const remount = (patch: Partial<typeof p>) => {
    setLanding('more');
    prefs.set(patch);
  };
  const exportNow = () => exportExcel().catch(() => toast(L('ফাইল তৈরি করা যায়নি', 'Could not create file')));

  const links: { icon: IconName; title: string; sub: string; href: Href }[] = [
    { icon: 'medicine', title: L('ওষুধের তালিকা', 'Medicine list'), sub: L(`${count(meds)} ওষুধ, আমার স্টক`, `${count(meds)} medicines, my stock`), href: '/medicines' },
    { icon: 'book', title: L('রোগের তালিকা', 'Disease list'), sub: L('সাধারণ রোগ বাংলা ও ইংরেজিতে', 'Common diseases in Bangla & English'), href: '/settings/diseases' },
    { icon: 'camera', title: L('খাতার ছবি', 'Notebook photos'), sub: L('সব পুরনো খাতার পাতা', 'All old notebook pages'), href: '/photos' },
    { icon: 'store', title: L('চেম্বারের তথ্য', 'Chamber details'), sub: L('প্রেসক্রিপশনে নাম-ঠিকানা', 'Name & address on prescriptions'), href: '/settings/chamber' },
    { icon: 'wallet', title: L('ফি ও পেমেন্ট', 'Fees & payment'), sub: L('সাধারণ ফি, বিকাশ/নগদ/রকেট নম্বর', 'Default fee, bKash/Nagad/Rocket'), href: '/settings/fees' },
    { icon: 'message', title: L('SMS রিমাইন্ডার', 'SMS reminders'), sub: L('আসার আগের দিন রোগীকে SMS', 'SMS the day before a visit'), href: '/settings/sms' },
    { icon: 'lock', title: L('পিন লক', 'PIN lock'), sub: lockOn ? L('চালু আছে', 'On') : L('অন্য কেউ যেন খুলতে না পারে', 'Keep others out'), href: '/settings/pin' },
  ];

  return (
    <Screen top>
      <H1>{L('আরও', 'More')}</H1>

      <View style={{ gap: 10, padding: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16 }}>
        <Row gap={10}><Icon name="globe" size={22} /><T size={18} w={700}>ভাষা / Language</T></Row>
        <Segmented options={[{ v: 'bn' as const, label: 'বাংলা' }, { v: 'en' as const, label: 'English' }]} value={p.lang} onChange={(lang) => remount({ lang })} />
      </View>

      <View style={{ gap: 10, padding: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16 }}>
        <T size={18} w={700}>{L('লেখার আকার', 'Text size')}</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([0, 1, 2] as const).map((sc) => {
            const on = p.scale === sc;
            return (
              <Press key={sc} haptic accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={L('লেখার আকার', 'Text size')} onPress={() => remount({ scale: sc })}
                style={{ flex: 1, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.primary : C.surface, borderWidth: on ? 0 : 1.5, borderColor: C.line }}>
                <T size={[18, 24, 32][sc] / [0.9, 1, 1.15][p.scale]} w={700} color={on ? '#FFFFFF' : C.ink} style={{ lineHeight: undefined }}>{L('অ', 'A')}</T>
              </Press>
            );
          })}
        </View>
      </View>

      <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, overflow: 'hidden' }}>
        {links.map((l, i) => (
          <Press key={l.title} onPress={() => router.push(l.href)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: i < links.length - 1 ? 1 : 0, borderBottomColor: C.divider }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={l.icon} size={22} color={C.primaryInk} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T size={18} w={700}>{l.title}</T>
              <T size={14} color={C.muted} lines={1}>{l.sub}</T>
            </View>
            <Icon name="chevronRight" size={22} color={C.muted} />
          </Press>
        ))}
      </View>

      {connected ? (
        <Row gap={12} style={{ paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.primarySoft, borderRadius: 16 }}>
          <Press onPress={() => router.push('/settings/backup')}><Icon name="cloudCheck" size={26} color={C.primaryInk} /></Press>
          <Press style={{ flex: 1 }} onPress={() => (sync.running ? null : syncNow())}>
            <T size={17} w={700} color={C.primaryInk}>{sync.error ? L('ব্যাকআপ আটকে আছে', 'Backup pending') : L('সব তথ্য নিরাপদে আছে', 'All data is backed up')}</T>
            <T size={15} color={C.safeText}>
              {sync.running ? L('ব্যাকআপ হচ্ছে…', 'Backing up…') : sync.error ? L('ইন্টারনেট পেলে আবার চেষ্টা হবে', 'Will retry when online') : p.lastBackupAt ? L(`শেষ ব্যাকআপ: ${ago(p.lastBackupAt)}`, `Last backup: ${ago(p.lastBackupAt)}`) : L('প্রথম ব্যাকআপ হচ্ছে', 'First backup pending')}
            </T>
          </Press>
          <Press onPress={exportNow} style={{ height: 46, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: C.safeBorder, backgroundColor: C.surface, justifyContent: 'center' }}>
            <T size={15} w={700} color={C.primaryInk}>{L('এক্সেলে নিন', 'Export Excel')}</T>
          </Press>
        </Row>
      ) : (
        <Row gap={12} style={{ paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.amberSoft, borderRadius: 16 }}>
          <Icon name="cloud" size={26} color={C.amberInk} />
          <Press style={{ flex: 1 }} onPress={() => router.push('/settings/backup')}>
            <T size={17} w={700} color={C.amberInk}>{L('অনলাইন ব্যাকআপ চালু নেই', 'Online backup is off')}</T>
            <T size={15} color={C.amberDeep}>{L('তথ্য শুধু এই ফোনে আছে — চালু করুন', 'Data is only on this phone — turn on')}</T>
          </Press>
          <Press onPress={exportNow} style={{ height: 46, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: C.dangerBorder, backgroundColor: C.surface, justifyContent: 'center' }}>
            <T size={15} w={700} color={C.amberInk}>{L('এক্সেলে নিন', 'Export Excel')}</T>
          </Press>
        </Row>
      )}

      <Press onPress={() => SUPPORT && Linking.openURL(`tel:${SUPPORT}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16 }}>
        <Icon name="phone" size={22} />
        <T size={16} style={{ flex: 1 }}>
          {L('কোনো সমস্যা? কল করুন ', 'Need help? Call ')}
          <T size={16} w={700}>{SUPPORT || L('[সাপোর্ট নম্বর]', '[support number]')}</T>
        </T>
      </Press>
    </Screen>
  );
}
