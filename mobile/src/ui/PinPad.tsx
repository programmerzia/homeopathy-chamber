import { useState } from 'react';
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon } from './Icon';
import { Press, T } from './kit';
import { C } from './theme';
import { L, n } from '@/lib/i18n';

/** 4-digit PIN entry. onDone returns false to shake/reset. */
export function PinPad({ title, subtitle, onDone }: { title: string; subtitle?: string; onDone: (pin: string) => Promise<boolean> | boolean }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const press = async (k: string) => {
    Haptics.selectionAsync().catch(() => {});
    if (k === 'del') return setPin((p) => p.slice(0, -1));
    const next = (pin + k).slice(0, 4);
    setPin(next);
    setError(false);
    if (next.length === 4) {
      const ok = await onDone(next);
      if (!ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setError(true);
      }
      setPin('');
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
  return (
    <View style={{ alignItems: 'center', gap: 28 }}>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <T size={24} w={700} center>{title}</T>
        {!!subtitle && <T size={16} color={error ? C.danger : C.muted} center>{error ? L('পিন মেলেনি, আবার চেষ্টা করুন', 'Wrong PIN, try again') : subtitle}</T>}
      </View>
      <View style={{ flexDirection: 'row', gap: 18 }} accessibilityLabel={L(`${n(pin.length)}টি সংখ্যা দেওয়া হয়েছে`, `${pin.length} digits entered`)}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: error ? C.danger : C.primary, backgroundColor: i < pin.length ? C.primary : 'transparent' }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 300, gap: 14, justifyContent: 'center' }}>
        {keys.map((k, i) =>
          k === '' ? (
            <View key={i} style={{ width: 88, height: 68 }} />
          ) : (
            <Press
              key={i}
              accessibilityLabel={k === 'del' ? L('মুছুন', 'Delete') : k}
              onPress={() => press(k)}
              style={{ width: 88, height: 68, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: k === 'del' ? 'transparent' : C.surface, borderWidth: k === 'del' ? 0 : 1, borderColor: C.border }}
            >
              {k === 'del' ? <Icon name="back" size={26} /> : <T size={28} w={600}>{n(k)}</T>}
            </Press>
          ),
        )}
      </View>
    </View>
  );
}
