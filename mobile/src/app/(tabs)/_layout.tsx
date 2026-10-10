import { useState } from 'react';
import { View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { prefs, takeLanding, useStore } from '@/lib/store';
import { L } from '@/lib/i18n';
import { Icon, type IconName } from '@/ui/Icon';
import { Press, T } from '@/ui/kit';
import { C, shadow } from '@/ui/theme';

export default function TabsLayout() {
  const setupDone = useStore(prefs, (p) => p.setupDone);
  const [initial] = useState(() => takeLanding() ?? 'index');
  if (!setupDone) return <Redirect href="/setup" />;
  return (
    <Tabs initialRouteName={initial} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg }, lazy: true }} tabBar={(p) => <NavBar {...p} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="patients" />
      <Tabs.Screen name="money" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}

const ITEMS: { name: string; icon: IconName; bn: string; en: string }[] = [
  { name: 'index', icon: 'home', bn: 'হোম', en: 'Home' },
  { name: 'patients', icon: 'users', bn: 'রোগী', en: 'Patients' },
  { name: 'money', icon: 'wallet', bn: 'হিসাব', en: 'Money' },
  { name: 'more', icon: 'grid', bn: 'আরও', en: 'More' },
];

function NavBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index].name;
  const item = (it: (typeof ITEMS)[number]) => {
    const on = current === it.name;
    return (
      <Press
        key={it.name}
        haptic
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        onPress={() => navigation.navigate(it.name)}
        style={{ width: 64, height: 56, alignItems: 'center', justifyContent: 'center', gap: 2 }}
      >
        <Icon name={it.icon} size={24} sw={on ? 2 : 1.8} color={on ? C.primary : C.muted} />
        <T size={15} w={on ? 700 : 500} color={on ? C.primary : C.muted}>{L(it.bn, it.en)}</T>
      </Press>
    );
  };
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={L('মূল মেনু', 'Main menu')}
      style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', paddingTop: 8, paddingHorizontal: 4, paddingBottom: Math.max(insets.bottom, 22), backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border }}
    >
      {item(ITEMS[0])}
      {item(ITEMS[1])}
      <Press haptic accessibilityRole="button" accessibilityLabel={L('রোগী দেখা', 'See patient')} onPress={() => router.push({ pathname: '/pick-patient', params: { mode: 'visit' } })} style={{ alignItems: 'center', gap: 2, marginTop: -26 }}>
        <View style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 4, borderColor: C.bg, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', ...shadow.fab }}>
          <Icon name="plus" size={26} sw={2.4} color="#FFFFFF" />
        </View>
        <T size={14} w={700} color={C.primary}>{L('রোগী দেখা', 'See patient')}</T>
      </Press>
      {item(ITEMS[2])}
      {item(ITEMS[3])}
    </View>
  );
}
