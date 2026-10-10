import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { checkPin, lockState, setPin } from '@/lib/lock';
import { useStore } from '@/lib/store';
import { toast } from '@/lib/hooks';
import { L } from '@/lib/i18n';
import { Btn, Header } from '@/ui/kit';
import { PinPad } from '@/ui/PinPad';

type Step = 'verify' | 'menu' | 'new' | 'confirm';

export default function PinSettings() {
  const enabled = useStore(lockState, (s) => s.enabled);
  const [step, setStep] = useState<Step>(enabled ? 'verify' : 'new');
  const [first, setFirst] = useState('');

  return (
    <View style={{ flex: 1 }}>
      <Header title={L('পিন লক', 'PIN lock')} />
      <View style={{ flex: 1, justifyContent: 'center', padding: 20, gap: 16 }}>
        {step === 'verify' && <PinPad key="v" title={L('বর্তমান পিন দিন', 'Enter current PIN')} subtitle={L('পরিবর্তনের আগে যাচাই', 'Verify before changing')} onDone={async (p) => { const ok = await checkPin(p); if (ok) setStep('menu'); return ok; }} />}
        {step === 'menu' && (
          <>
            <Btn label={L('নতুন পিন দিন', 'Change PIN')} onPress={() => setStep('new')} />
            <Btn kind="danger" label={L('পিন লক বন্ধ করুন', 'Turn off PIN lock')} onPress={async () => { await setPin(null); toast(L('পিন লক বন্ধ', 'PIN lock off')); router.back(); }} />
          </>
        )}
        {step === 'new' && <PinPad key="n" title={L('নতুন ৪ সংখ্যার পিন', 'New 4-digit PIN')} subtitle={L('অ্যাপ খুলতে এই পিন লাগবে', 'Needed to open the app')} onDone={(p) => { setFirst(p); setStep('confirm'); return true; }} />}
        {step === 'confirm' && (
          <PinPad key="c" title={L('আবার দিন', 'Repeat PIN')} subtitle={L('নিশ্চিত করতে', 'To confirm')} onDone={async (p) => {
            if (p !== first) return false;
            await setPin(p);
            toast(L('পিন লক চালু হয়েছে', 'PIN lock is on'));
            router.back();
            return true;
          }} />
        )}
      </View>
    </View>
  );
}
