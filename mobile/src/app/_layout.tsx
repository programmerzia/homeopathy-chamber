import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, HindSiliguri_400Regular, HindSiliguri_500Medium, HindSiliguri_600SemiBold, HindSiliguri_700Bold } from '@expo-google-fonts/hind-siliguri';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { migrate } from '@/lib/db';
import { seedIfEmpty } from '@/lib/seed';
import { prefs, useStore } from '@/lib/store';
import { startSync } from '@/lib/sync';
import { initLock, lockState, checkPin } from '@/lib/lock';
import { toastStore } from '@/lib/hooks';
import { L } from '@/lib/i18n';
import { T } from '@/ui/kit';
import { PinPad } from '@/ui/PinPad';
import { C } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
migrate();
seedIfEmpty();

const sheet = { presentation: 'transparentModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent' } } as const;

export default function Root() {
  const [fonts] = useFonts({ HindSiliguri_400Regular, HindSiliguri_500Medium, HindSiliguri_600SemiBold, HindSiliguri_700Bold, Fraunces_600SemiBold });
  const lang = useStore(prefs, (p) => p.lang);
  const scale = useStore(prefs, (p) => p.scale);
  const lock = useStore(lockState, (s) => s);

  useEffect(() => {
    initLock();
    return startSync();
  }, []);
  useEffect(() => {
    if (fonts && lock.ready) SplashScreen.hideAsync().catch(() => {});
  }, [fonts, lock.ready]);

  if (!fonts || !lock.ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {/* language / text-size changes re-mount the tree so every string and size updates */}
      <View style={{ flex: 1, backgroundColor: C.bg }} key={`${lang}-${scale}`}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="setup" options={{ animation: 'fade' }} />
          <Stack.Screen name="visit/dose" options={sheet} />
          <Stack.Screen name="visit/advice" options={sheet} />
          <Stack.Screen name="patient/collect" options={sheet} />
          <Stack.Screen name="pick-patient" options={sheet} />
          <Stack.Screen name="pick-disease" options={sheet} />
          <Stack.Screen name="expense" options={sheet} />
          <Stack.Screen name="medicine-edit" options={sheet} />
          <Stack.Screen name="khata" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        </Stack>
        {lock.locked && (
          <View style={{ position: 'absolute', inset: 0, backgroundColor: C.bg, justifyContent: 'center' }}>
            <PinPad title={L('পিন দিন', 'Enter PIN')} subtitle={L('চেম্বারের তথ্য সুরক্ষিত', 'Chamber data is protected')} onDone={checkPin} />
          </View>
        )}
        <ToastHost />
      </View>
    </SafeAreaProvider>
  );
}

function ToastHost() {
  const t = useStore(toastStore, (s) => s);
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!t.id) return;
    opacity.setValue(0);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [t.id, opacity]);
  if (!t.id) return null;
  return (
    <Animated.View pointerEvents="none" accessibilityLiveRegion="polite" style={{ position: 'absolute', left: 20, right: 20, bottom: 110, alignItems: 'center', opacity }}>
      <View style={{ backgroundColor: C.ink, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, maxWidth: 360 }}>
        <T size={16} w={600} color="#FFFFFF" center>{t.msg}</T>
      </View>
    </Animated.View>
  );
}
