import { useState } from 'react';
import { Linking, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as SMS from 'expo-sms';
import { save } from '@/lib/db';
import { toast, useData } from '@/lib/hooks';
import { getChamber, getPatient, getVisit, listAdvice, todayQueue } from '@/lib/repo';
import { beginVisit } from '@/lib/draft';
import { prefs } from '@/lib/store';
import { addDays, dayDate, L, longDate, n, shortDate, slashDate } from '@/lib/i18n';
import { formLabel, medTitle, rxLine } from '@/lib/dose';
import { code4 } from '@/lib/labels';
import { adviceText, doctorLine, labelsHtml, payText, rxHtml, rxText, type RxData } from '@/lib/rx';
import { Btn, Divider, Empty, Header, Press, Row, Screen, Segmented, T, Tag } from '@/ui/kit';
import { Icon, type IconName } from '@/ui/Icon';
import { C, shadow } from '@/ui/theme';

export default function Prescription() {
  const { id, saved } = useLocalSearchParams<{ id: string; saved?: string }>();
  const insets = useSafeAreaInsets();
  const v = useData(() => getVisit(id), [id], ['visits']);
  const p = v ? getPatient(v.patient_id) : null;
  const ch = useData(getChamber, [], ['settings']);
  const allAdvice = useData(listAdvice, [], ['advice']);
  const [lang, setLang] = useState<'bn' | 'en'>(v?.lang ?? prefs.get().lang);

  if (!v || !p) return <View style={{ flex: 1 }}><Header title={L('প্রেসক্রিপশন', 'Prescription')} /><Empty icon="printer" text={L('পাওয়া যায়নি', 'Not found')} /></View>;

  const advice = allAdvice.filter((a) => v.advice.includes(a.id));
  const data: RxData = { v, p, ch, advice, lang };
  const setRxLang = (l: 'bn' | 'en') => {
    setLang(l);
    save('visits', { id: v.id, lang: l });
  };
  const reminderOn = ch.smsReminders && !!prefs.get().token && !!v.next_visit;

  const sendSms = async () => {
    if (!(await SMS.isAvailableAsync())) return toast(L('এই ফোনে SMS পাঠানো যাচ্ছে না', 'SMS not available on this phone'));
    await SMS.sendSMSAsync([p.phone], rxText(data));
  };
  const whatsapp = async () => {
    const url = `https://wa.me/88${p.phone}?text=${encodeURIComponent(rxText(data))}`;
    Linking.openURL(url).catch(() => toast(L('WhatsApp খোলা যায়নি', 'Could not open WhatsApp')));
  };
  const print = () => Print.printAsync({ html: rxHtml(data) }).catch(() => {});
  const labels = () => Print.printAsync({ html: labelsHtml(data) }).catch(() => {});
  const nextPatient = () => {
    const next = todayQueue().find((q) => q.status === 'waiting');
    router.dismissAll();
    if (next) beginVisit(next.patient_id);
    else toast(L('সিরিয়ালে আর কেউ নেই', 'No one else waiting'));
  };

  return (
    <View style={{ flex: 1 }}>
      {saved ? <View style={{ height: insets.top, backgroundColor: C.bg }} /> : <Header title={L('প্রেসক্রিপশন', 'Prescription')} />}
      <Screen gap={16} contentStyle={{ paddingTop: saved ? 24 : 20 }}>
        {saved && (
          <Row gap={12}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={24} color="#FFFFFF" sw={2.6} />
            </View>
            <View style={{ flex: 1 }}>
              <T size={20} w={700}>{L('সেভ হয়েছে', 'Saved')}</T>
              <T size={15} color={C.muted}>
                {reminderOn
                  ? L(`${shortDate(addDays(v.next_visit!, -1))} রোগীকে SMS-এ মনে করানো হবে`, `Patient gets an SMS reminder on ${shortDate(addDays(v.next_visit!, -1))}`)
                  : v.next_visit ? L(`আবার আসবেন ${dayDate(v.next_visit)}`, `Next visit ${dayDate(v.next_visit)}`) : L('প্রেসক্রিপশন তৈরি', 'Prescription ready')}
              </T>
            </View>
          </Row>
        )}

        <View style={{ gap: 6 }}>
          <T size={15} w={600} color={C.muted}>{L('প্রেসক্রিপশনের ভাষা', 'Prescription language')}</T>
          <Segmented h={42} options={[{ v: 'bn' as const, label: 'বাংলা' }, { v: 'en' as const, label: 'English' }]} value={lang} onChange={setRxLang} />
        </View>

        <View style={{ gap: 14, padding: 20, backgroundColor: C.rxPaper, borderWidth: 1, borderColor: C.border, borderRadius: 16, ...shadow.paper }}>
          <View style={{ alignItems: 'center', gap: 2 }}>
            <T serif size={21} color={C.primary} center>{ch.chamberName || L('[চেম্বারের নাম]', '[Chamber name]')}</T>
            {!!doctorLine(ch, lang) && <T size={14} color={C.muted} center>{doctorLine(ch, lang)}</T>}
            {!!(ch.address || ch.phone) && <T size={14} color={C.muted} center>{[ch.address, n(ch.phone, lang)].filter(Boolean).join(' · ')}</T>}
          </View>
          <Divider />
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <T size={16} w={700}>{p.name}</T>
              <T size={16} color={C.muted}>{[p.age != null ? (lang === 'bn' ? `${n(p.age, 'bn')} বছর` : `${p.age} yrs`) : '', `${lang === 'bn' ? 'আইডি' : 'ID'} ${n(code4(p.code), lang)}`].filter(Boolean).join(' · ')}</T>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <T size={16} color={C.muted}>{lang === 'bn' ? 'তারিখ' : 'Date'}</T>
              <T size={16} w={700}>{slashDate(v.date, lang)}</T>
            </View>
          </Row>
          {v.meds.length > 0 && (
            <View style={{ gap: 14, padding: 14, backgroundColor: C.rxBox, borderRadius: 12 }}>
              {v.meds.map((m, i) => (
                <Row key={m.key} gap={10} style={{ alignItems: 'flex-start' }}>
                  <T size={17} w={700} color={C.amberInk} style={{ width: 22 }}>{n(i + 1, lang)}.</T>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Row wrap>
                      <T size={18} w={700}>{medTitle(m, i, lang, true)}</T>
                      <Tag label={formLabel(m.form, lang)} />
                    </Row>
                    <T size={16} color={C.body}>{rxLine(m, lang)}</T>
                    {m.hide && <T size={13} color={C.amberInk}>{L(`শুধু আপনি দেখছেন: ${m.name} ${m.potency}`, `Only you see: ${m.name} ${m.potency}`)}</T>}
                  </View>
                </Row>
              ))}
            </View>
          )}
          {advice.length > 0 && (
            <View style={{ gap: 6 }}>
              <T size={16} w={700}>{lang === 'bn' ? 'নিয়ম' : 'Advice'}</T>
              {advice.map((a) => (
                <Row key={a.id} gap={8} style={{ alignItems: 'flex-start' }}>
                  <T size={15} color={C.body}>•</T>
                  <T size={15} color={C.body} style={{ flex: 1 }}>{adviceText(a, lang)}</T>
                </Row>
              ))}
            </View>
          )}
          <Divider />
          {v.next_visit && (
            <Row style={{ justifyContent: 'space-between' }}>
              <T size={16} color={C.muted}>{lang === 'bn' ? 'আবার আসবেন' : 'Next visit'}</T>
              <T size={16} w={700}>{dayDate(v.next_visit, lang)}</T>
            </Row>
          )}
          <Row style={{ justifyContent: 'space-between' }}>
            <T size={16} color={C.muted}>{lang === 'bn' ? 'টাকা' : 'Payment'}</T>
            <T size={16} w={700}>{payText(data)}</T>
          </Row>
        </View>

        <View style={{ gap: 10, marginTop: 6 }}>
          <Btn icon="message" label={L('রোগীকে SMS পাঠান', 'Send SMS to patient')} onPress={sendSms} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Tile icon="share" label="WhatsApp" onPress={whatsapp} />
            <Tile icon="printer" label={L('প্রিন্ট', 'Print')} onPress={print} />
            <Tile icon="tag" label={L('শিশির লেবেল', 'Bottle labels')} onPress={labels} />
          </View>
          {saved ? (
            <Press onPress={nextPatient} style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}>
              <T size={17} w={700} color={C.primary}>{L('পরের রোগী ডাকুন →', 'Call next patient →')}</T>
            </Press>
          ) : (
            <T size={14} color={C.muted} center>{longDate(v.date)}</T>
          )}
        </View>
      </Screen>
    </View>
  );
}

function Tile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Press haptic onPress={onPress} accessibilityRole="button" style={{ flex: 1, height: 70, borderRadius: 16, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <Icon name={icon} size={22} />
      <T size={15} w={700}>{label}</T>
    </Press>
  );
}
