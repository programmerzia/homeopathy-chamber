import { View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { prefs, useStore } from '@/lib/store';
import { L } from '@/lib/i18n';
import { ChamberForm } from '@/features/ChamberForm';
import { Segmented, T } from '@/ui/kit';
import { C } from '@/ui/theme';

/** First run: language + chamber details. Everything else can be set later. */
export default function Setup() {
  const insets = useSafeAreaInsets();
  const lang = useStore(prefs, (p) => p.lang);
  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ChamberForm
        withFee
        cta={L('শুরু করুন', 'Get started')}
        onSaved={() => {
          prefs.set({ setupDone: true });
          router.replace('/');
        }}
        intro={
          <View style={{ gap: 16 }}>
            <View style={{ gap: 4 }}>
              <T serif size={30} color={C.primary}>{L('স্বাগতম', 'Welcome')}</T>
              <T size={17} color={C.muted}>{L('চেম্বারের তথ্য দিন — প্রেসক্রিপশনে ছাপা হবে। পরে বদলানো যাবে।', 'Add your chamber details — they appear on prescriptions. You can change them later.')}</T>
            </View>
            <Segmented options={[{ v: 'bn' as const, label: 'বাংলা' }, { v: 'en' as const, label: 'English' }]} value={lang} onChange={(l) => prefs.set({ lang: l })} />
          </View>
        }
      />
    </View>
  );
}
