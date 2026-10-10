import { pathToFileURL } from 'node:url';
const SHIMS = new URL('./shims/', import.meta.url);
const MOCK = { 'expo-sqlite': 'sqlite.mjs', 'expo-sqlite/kv-store': 'kv.mjs', 'expo-crypto': 'crypto.mjs', 'expo-router': 'router.mjs', 'react-native': 'rn.mjs', 'expo-file-system': 'fs.mjs' };
export async function resolve(spec, ctx, next) {
  if (MOCK[spec]) return { url: new URL(MOCK[spec], SHIMS).href, shortCircuit: true };
  if ((spec.startsWith('./') || spec.startsWith('../')) && !/\.\w+$/.test(spec)) {
    try { return await next(spec + '.ts', ctx); } catch {}
  }
  return next(spec, ctx);
}
