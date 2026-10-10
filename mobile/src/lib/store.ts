import { useSyncExternalStore } from 'react';
import Storage from 'expo-sqlite/kv-store';

/** Minimal observable store; components subscribe with useStore(store, selector). */
export function createStore<T>(initial: T) {
  let state = initial;
  const subs = new Set<() => void>();
  return {
    get: () => state,
    set(next: Partial<T> | ((s: T) => Partial<T>)) {
      const patch = typeof next === 'function' ? next(state) : next;
      state = { ...state, ...patch };
      subs.forEach((f) => f());
    },
    replace(next: T) {
      state = next;
      subs.forEach((f) => f());
    },
    subscribe(f: () => void) {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
  };
}
export type Store<T> = ReturnType<typeof createStore<T>>;

export function useStore<T, S>(store: Store<T>, sel: (s: T) => S): S {
  return useSyncExternalStore(store.subscribe, () => sel(store.get()));
}

// ---------- device-local preferences (never synced) ----------
export type Lang = 'bn' | 'en';
export type Prefs = {
  lang: Lang;
  scale: 0 | 1 | 2;
  apiUrl: string;
  token: string;
  lastRev: number;
  lastBackupAt: number;
  setupDone: boolean;
  recent: string[]; // recently opened patient ids
};

const defaults: Prefs = {
  lang: 'bn',
  scale: 1,
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
  token: '',
  lastRev: 0,
  lastBackupAt: 0,
  setupDone: false,
  recent: [],
};

function loadPrefs(): Prefs {
  try {
    const raw = Storage.getItemSync('prefs');
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

export const prefs = createStore<Prefs>(loadPrefs());
prefs.subscribe(() => {
  try {
    Storage.setItemSync('prefs', JSON.stringify(prefs.get()));
  } catch {}
});

export function pushRecent(id: string) {
  const r = prefs.get().recent.filter((x) => x !== id);
  prefs.set({ recent: [id, ...r].slice(0, 6) });
}

/** Tab to land on after a language/text-size re-mount (so the user stays on "More"). */
let landing: string | null = null;
export const setLanding = (tab: string) => (landing = tab);
export const takeLanding = () => {
  const t = landing;
  landing = null;
  return t;
};
