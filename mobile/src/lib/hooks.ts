import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { onChange, type Table } from './db';
import { createStore } from './store';
import { L } from './i18n';

/** Synchronous SQLite read that re-runs whenever one of `tables` changes. */
export function useData<T>(fn: () => T, deps: unknown[], tables: Table[]): T {
  const [ver, setVer] = useState(0);
  const tablesRef = useRef(tables);
  useEffect(
    () =>
      onChange((changed) => {
        if (tablesRef.current.some((t) => changed.has(t))) setVer((v) => v + 1);
      }),
    [],
  );
  // derived state: re-run the query only when deps or the table version change
  const [cached, setCached] = useState(() => ({ deps, ver, value: fn() }));
  if (cached.ver !== ver || cached.deps.length !== deps.length || cached.deps.some((d, i) => !Object.is(d, deps[i]))) {
    const next = { deps, ver, value: fn() };
    setCached(next);
    return next.value;
  }
  return cached.value;
}

export function useDebounced<T>(value: T, ms = 120): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// ---------------- toast ----------------
export const toastStore = createStore({ msg: '', id: 0 });
export function toast(msg: string) {
  toastStore.set((s) => ({ msg, id: s.id + 1 }));
}

export function confirm(title: string, message: string, okLabel: string, destructive = true): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: L('না', 'Cancel'), style: 'cancel', onPress: () => resolve(false) },
      { text: okLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]),
  );
}

// ---------------- voice input (needs a development build; degrades gracefully in Expo Go) ----------------
let Speech: any = null;
try {
  // optional native module: missing in Expo Go
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Speech = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch {}

export const voiceState = createStore({ listening: false });

/** Start dictation; calls onText with the final transcript. Bengali by default. */
export async function dictate(onText: (text: string) => void, lang: 'bn-BD' | 'en-US' = 'bn-BD') {
  if (!Speech) {
    toast(L('কীবোর্ডের মাইক বোতাম দিয়ে বলুন', 'Use the mic key on your keyboard'));
    return;
  }
  try {
    const perm = await Speech.requestPermissionsAsync();
    if (!perm.granted) return toast(L('মাইক্রোফোনের অনুমতি দিন', 'Allow microphone access'));
    const subs: { remove(): void }[] = [];
    const done = () => {
      subs.forEach((s) => s.remove());
      voiceState.set({ listening: false });
    };
    subs.push(
      Speech.addListener('result', (e: any) => {
        if (e.isFinal && e.results?.[0]?.transcript) onText(e.results[0].transcript.trim());
      }),
      Speech.addListener('end', done),
      Speech.addListener('error', (e: any) => {
        done();
        if (e?.error !== 'no-speech' && e?.error !== 'aborted') toast(L('শোনা যায়নি, আবার বলুন', "Didn't catch that, try again"));
      }),
    );
    voiceState.set({ listening: true });
    toast(L('বলুন… শুনছি', 'Listening…'));
    Speech.start({ lang, interimResults: false, continuous: false });
  } catch {
    voiceState.set({ listening: false });
    toast(L('ভয়েস চালু করা যায়নি', 'Voice input unavailable'));
  }
}
