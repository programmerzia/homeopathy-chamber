import { View } from 'react-native';
import { router } from 'expo-router';
import { useData } from '@/lib/hooks';
import { getChamber, saveChamber } from '@/lib/repo';
import { prefs, useStore } from '@/lib/store';
import { L } from '@/lib/i18n';
import { Btn, Header, Row, Screen, T, Toggle } from '@/ui/kit';
import { Icon } from '@/ui/Icon';
import { C } from '@/ui/theme';

export default function SmsSettings() {
  const ch = useData(getChamber, [], ['settings']);
  const connected = useStore(prefs, (p) => !!p.token);
  const preview = `প্রিয় রহিমা বেগম, আগামীকাল ${ch.chamberName || '[চেম্বারের নাম]'}-এ আপনার আবার আসার তারিখ। — ${ch.doctorName || ch.chamberName || '[ডাক্তার]'}`;
  return (
    <View style={{ flex: 1 }}>
      <Header title={L('SMS রিমাইন্ডার', 'SMS reminders')} />
      <Screen>
        <Row gap={12} style={{ padding: 16, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border }}>
          <View style={{ flex: 1 }}>
            <T size={18} w={700}>{L('আসার আগের দিন SMS', 'SMS the day before')}</T>
            <T size={15} color={C.muted}>{L('সকাল ১০টার পর রোগীর মোবাইলে যাবে', 'Sent after 10 am to the patient')}</T>
          </View>
          <Toggle value={ch.smsReminders} onChange={(v) => saveChamber({ smsReminders: v })} label={L('SMS রিমাইন্ডার', 'SMS reminders')} />
        </Row>
        <View style={{ gap: 8 }}>
          <T size={15} w={600} color={C.muted}>{L('রোগী যা পাবেন', 'What the patient gets')}</T>
          <View style={{ padding: 16, backgroundColor: C.primarySoft, borderRadius: 16, borderTopLeftRadius: 4 }}>
            <T size={16} color={C.primaryInk}>{preview}</T>
          </View>
        </View>
        {!connected && (
          <View style={{ gap: 12, padding: 16, backgroundColor: C.amberSoft, borderRadius: 16 }}>
            <Row gap={10} style={{ alignItems: 'flex-start' }}>
              <Icon name="info" size={22} color={C.amberInk} />
              <T size={16} color={C.amberDeep} style={{ flex: 1 }}>{L('স্বয়ংক্রিয় SMS পাঠাতে অনলাইন ব্যাকআপ চালু থাকতে হবে — সার্ভার থেকে SMS যায়।', 'Automatic SMS needs online backup — messages are sent by the server.')}</T>
            </Row>
            <Btn kind="outline" h={50} size={16} label={L('ব্যাকআপ চালু করুন', 'Turn on backup')} onPress={() => router.push('/settings/backup')} />
          </View>
        )}
        <T size={15} color={C.muted}>{L('প্রেসক্রিপশন পাতা থেকে যেকোনো রোগীকে নিজের ফোন দিয়েও SMS পাঠাতে পারবেন।', 'You can also SMS any patient from your own phone on the prescription page.')}</T>
      </Screen>
    </View>
  );
}
