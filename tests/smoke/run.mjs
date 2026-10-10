// Node 24+: TypeScript is type-stripped; Expo modules are replaced by tiny shims (see hooks.mjs).
import { register } from 'node:module';
register('./hooks.mjs', import.meta.url);
await import('./test.mjs');
