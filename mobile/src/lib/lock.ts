import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { createStore } from './store';

const KEY = 'pin_v1';
export const lockState = createStore({ enabled: false, locked: false, ready: false });

const hash = (pin: string, salt: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);

export async function initLock() {
  const stored = await SecureStore.getItemAsync(KEY);
  lockState.set({ enabled: !!stored, locked: !!stored, ready: true });
  let leftAt = 0;
  AppState.addEventListener('change', (s) => {
    if (s === 'background') leftAt = Date.now();
    else if (s === 'active' && lockState.get().enabled && leftAt && Date.now() - leftAt > 60_000) lockState.set({ locked: true });
  });
}

export async function setPin(pin: string | null) {
  if (!pin) {
    await SecureStore.deleteItemAsync(KEY);
    lockState.set({ enabled: false, locked: false });
    return;
  }
  const salt = Crypto.randomUUID();
  await SecureStore.setItemAsync(KEY, `${salt}$${await hash(pin, salt)}`);
  lockState.set({ enabled: true });
}

export async function checkPin(pin: string) {
  const stored = await SecureStore.getItemAsync(KEY);
  if (!stored) return true;
  const [salt, h] = stored.split('$');
  const ok = (await hash(pin, salt)) === h;
  if (ok) lockState.set({ locked: false });
  return ok;
}
