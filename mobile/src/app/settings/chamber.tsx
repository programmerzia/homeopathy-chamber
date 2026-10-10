import { View } from 'react-native';
import { router } from 'expo-router';
import { toast } from '@/lib/hooks';
import { L } from '@/lib/i18n';
import { ChamberForm } from '@/features/ChamberForm';
import { Header } from '@/ui/kit';

export default function ChamberSettingsScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Header title={L('চেম্বারের তথ্য', 'Chamber details')} />
      <ChamberForm cta={L('সেভ করুন', 'Save')} onSaved={() => { toast(L('সেভ হয়েছে', 'Saved')); router.back(); }} />
    </View>
  );
}
