import { Hono } from 'hono';
import { z } from 'zod';
import { normalisePhone } from './auth.ts';
import type { DB } from './db.ts';
import { parseJson, type AppEnv } from './http.ts';

export interface SmsProvider {
  readonly name: string;
  /** Resolves on success, throws on failure. `to` is a normalised 01XXXXXXXXX number. */
  send(to: string, text: string): Promise<void>;
}

export const consoleProvider: SmsProvider = {
  name: 'console',
  async send(to, text) {
    console.log(`[sms:console] -> ${to}: ${text}`);
  },
};

export function bulksmsbdProvider(apiKey: string, senderId: string): SmsProvider {
  return {
    name: 'bulksmsbd',
    async send(to, text) {
      const params = new URLSearchParams({
        api_key: apiKey,
        senderid: senderId,
        number: '88' + to,
        message: text,
        // Bengali (any non-ASCII) must go as unicode or the gateway mangles it.
        type: /[^\x00-\x7f]/.test(text) ? 'unicode' : 'text',
      });
      const res = await fetch('http://bulksmsbd.net/api/smsapi', { method: 'POST', body: params, signal: AbortSignal.timeout(15_000) });
      const raw = await res.text();
      let code: unknown;
      try { code = JSON.parse(raw).response_code; } catch { /* non-JSON reply */ }
      if (!res.ok || Number(code) !== 202) throw new Error(`bulksmsbd: HTTP ${res.status} ${raw.slice(0, 200)}`);
    },
  };
}

export function providerFromEnv(env: NodeJS.ProcessEnv = process.env): SmsProvider {
  if (env.SMS_PROVIDER === 'bulksmsbd') {
    if (!env.SMS_API_KEY || !env.SMS_SENDER_ID) throw new Error('SMS_PROVIDER=bulksmsbd needs SMS_API_KEY and SMS_SENDER_ID');
    return bulksmsbdProvider(env.SMS_API_KEY, env.SMS_SENDER_ID);
  }
  return consoleProvider;
}

export type SmsMeta = { chamberId: string; kind: 'manual' | 'reminder'; ref?: string; day?: string };

/** Send one SMS and log it to sms_log. Never throws; returns success. */
export function makeSender(db: DB, provider: SmsProvider) {
  const log = db.prepare(
    'INSERT INTO sms_log (chamber_id, kind, ref, day, to_phone, text, ok, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  return async (meta: SmsMeta, to: string, text: string): Promise<boolean> => {
    const phone = normalisePhone(to);
    let error: string | null = phone ? null : 'invalid number';
    if (phone) {
      try {
        await provider.send(phone, text);
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
    }
    log.run(meta.chamberId, meta.kind, meta.ref ?? null, meta.day ?? null, phone ?? to, text, error ? 0 : 1, error, Date.now());
    if (error) console.warn(`[sms] send to ${to} failed: ${error}`);
    return !error;
  };
}

const SendBody = z.object({
  messages: z.array(z.object({ to: z.string().max(32), text: z.string().min(1).max(1000) })).min(1).max(200),
});

export function smsRoutes(send: ReturnType<typeof makeSender>) {
  return new Hono<AppEnv>().post('/send', async (c) => {
    const { messages } = await parseJson(c, SendBody);
    let sent = 0;
    const queue = [...messages];
    // Small worker pool: keeps a 200-message batch fast without hammering the gateway.
    await Promise.all(Array.from({ length: 5 }, async () => {
      for (let m = queue.shift(); m; m = queue.shift()) {
        if (await send({ chamberId: c.var.chamberId, kind: 'manual' }, m.to, m.text)) sent++;
      }
    }));
    return c.json({ sent, failed: messages.length - sent });
  });
}
