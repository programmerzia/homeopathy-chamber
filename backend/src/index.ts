import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import { openDb } from './db.ts';
import { startReminders } from './reminders.ts';
import { makeSender, providerFromEnv } from './sms.ts';

const env = process.env;
const port = Number(env.PORT ?? 8787);
const dataDir = resolve(env.DATA_DIR ?? './data');

let jwtSecret = env.JWT_SECRET ?? '';
if (!jwtSecret) {
  if (env.NODE_ENV === 'production') {
    console.error('JWT_SECRET must be set in production');
    process.exit(1);
  }
  jwtSecret = 'dev-insecure-secret-change-me';
  console.warn('WARNING: JWT_SECRET not set, using an insecure development secret');
}

mkdirSync(dataDir, { recursive: true });
const db = openDb(join(dataDir, 'chamber.db'));
const sms = providerFromEnv(env);
const app = createApp(db, { jwtSecret, dataDir, sms, log: true });
const stopReminders = env.REMINDERS === 'off' ? () => {} : startReminders(db, makeSender(db, sms));

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`listening on :${info.port} (data: ${dataDir}, sms: ${sms.name}, reminders: ${env.REMINDERS === 'off' ? 'off' : 'on'})`);
});

let closing = false;
function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  console.log(`${signal} received, shutting down`);
  stopReminders();
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
