import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.ts';
import { openDb } from '../src/db.ts';
import type { SmsProvider } from '../src/sms.ts';

export function setup() {
  const db = openDb(':memory:');
  const dataDir = mkdtempSync(join(tmpdir(), 'chamber-test-'));
  const outbox: { to: string; text: string }[] = [];
  const sms: SmsProvider = { name: 'test', async send(to, text) { outbox.push({ to, text }); } };
  const app = createApp(db, { jwtSecret: 'test-secret', dataDir, sms });

  const req = (method: string, path: string, body?: unknown, token?: string, headers: Record<string, string> = {}) =>
    app.request(path, {
      method,
      headers: { ...(body !== undefined && !(body instanceof Uint8Array) ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: (body === undefined ? undefined : body instanceof Uint8Array ? body : JSON.stringify(body)) as BodyInit | undefined,
    });

  const register = async (phone = '01712345678', pin = '1234', chamberName = 'Test Chamber') => {
    const res = await req('POST', '/auth/register', { phone, pin, chamberName });
    if (res.status !== 201) throw new Error(`register failed: ${res.status} ${await res.text()}`);
    return (await res.json()) as { token: string; chamber: { id: string; name: string } };
  };

  return { db, app, dataDir, outbox, req, register };
}
