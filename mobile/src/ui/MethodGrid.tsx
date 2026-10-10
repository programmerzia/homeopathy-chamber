import { View } from 'react-native';
import { METHODS } from '@/lib/labels';
import { L } from '@/lib/i18n';
import type { Method } from '@/lib/types';
import { Icon } from './Icon';
import { Press, T } from './kit';
import { C } from './theme';

/** Cash / bKash / Nagad / Rocket 2×2 grid from the payment step. */
export function MethodGrid({ value, onChange }: { value: Method; onChange: (m: Method) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {METHODS.map((m) => {
        const on = value === m.v;
        return (
          <Press
            key={m.v}
            haptic
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(m.v)}
            style={{ width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 10, height: 72, paddingHorizontal: 14, borderRadius: 16, backgroundColor: on ? C.primary : C.surface, borderWidth: on ? 0 : 1.5, borderColor: C.line }}
          >
            <Icon name={m.v === 'cash' ? 'cash' : 'mobile'} size={26} color={on ? '#FFFFFF' : C.ink} />
            <View>
              <T size={19} w={700} color={on ? '#FFFFFF' : C.ink}>{L(m.bn, m.en)}</T>
              <T size={13} color={on ? C.onPrimaryMuted : C.muted}>{L(m.subBn, m.subEn)}</T>
            </View>
          </Press>
        );
      })}
    </View>
  );
}
