import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Hono, type MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { sign, verify } from 'hono/jwt';
import { z } from 'zod';
import type { DB } from './db.ts';
import { parseJson, type AppEnv } from './http.ts';

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const TOKEN_TTL_S = 180 * 24 * 3600;
const MAX_FAILS = 5;
const FAIL_WINDOW_MS = 15 * 60 * 1000;

/** Normalise a Bangladeshi mobile number to 01XXXXXXXXX, or null if invalid. */
export function normalisePhone(input: string): string | null {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('880')) d = d.slice(2);
  else if (d.startsWith('1') && d.length === 10) d = '0' + d;
  return /^01[3-9]\d{8}$/.test(d) ? d : null;
}

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(pin, salt, 32);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [, saltHex, hashHex] = stored.split('$');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(pin, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

const phone = z.string().transform((s, ctx) => normalisePhone(s) ?? (ctx.addIssue({ code: 'custom', message: 'invalid BD mobile number' }), z.NEVER));
const pin = z.string().regex(/^\d{4,6}$/, 'pin must be 4-6 digits');
const RegisterBody = z.object({
  phone,
  pin,
  chamberName: z.string().trim().min(1).max(120),
  doctorName: z.string().trim().max(120).optional(),
});
const LoginBody = z.object({ phone, pin: z.string().max(64) });

type ChamberRow = { id: string; name: string; phone: string; pin_hash: string };

export function authRoutes(db: DB, secret: string) {
  const fails = new Map<string, { count: number; resetAt: number }>();
  const byPhone = db.prepare('SELECT id, name, phone, pin_hash FROM chambers WHERE phone = ?');
  const insert = db.prepare('INSERT INTO chambers (id, phone, pin_hash, name, doctor_name, created_at) VALUES (?, ?, ?, ?, ?, ?)');

  const issue = async (c: { id: string; name: string }) => ({
    token: await sign({ sub: c.id, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_S }, secret, 'HS256'),
    chamber: { id: c.id, name: c.name },
  });

  return new Hono<AppEnv>()
    .post('/register', async (c) => {
      const body = await parseJson(c, RegisterBody);
      if (byPhone.get(body.phone)) throw new HTTPException(409, { message: 'phone already registered' });
      const id = randomUUID();
      try {
        insert.run(id, body.phone, await hashPin(body.pin), body.chamberName, body.doctorName ?? null, Date.now());
      } catch (err) {
        // Concurrent registration with the same phone lost the race to the UNIQUE constraint.
        if (String(err).includes('UNIQUE')) throw new HTTPException(409, { message: 'phone already registered' });
        throw err;
      }
      return c.json(await issue({ id, name: body.chamberName }), 201);
    })
    .post('/login', async (c) => {
      const body = await parseJson(c, LoginBody);
      const now = Date.now();
      const f = fails.get(body.phone);
      if (f && f.resetAt <= now) fails.delete(body.phone);
      else if (f && f.count >= MAX_FAILS) {
        c.header('Retry-After', String(Math.ceil((f.resetAt - now) / 1000)));
        throw new HTTPException(429, { message: 'too many failed attempts, try again later' });
      }
      const row = byPhone.get(body.phone) as ChamberRow | undefined;
      if (!row || !(await verifyPin(body.pin, row.pin_hash))) {
        const cur = fails.get(body.phone) ?? { count: 0, resetAt: now + FAIL_WINDOW_MS };
        cur.count++;
        fails.set(body.phone, cur);
        if (fails.size > 10_000) for (const [k, v] of fails) if (v.resetAt <= now) fails.delete(k);
        throw new HTTPException(401, { message: 'invalid phone or pin' });
      }
      fails.delete(body.phone);
      return c.json(await issue(row));
    });
}

/** Bearer-token middleware; sets c.var.chamberId. */
export function requireAuth(db: DB, secret: string): MiddlewareHandler<AppEnv> {
  const exists = db.prepare('SELECT 1 FROM chambers WHERE id = ?');
  return async (c, next) => {
    const m = /^Bearer\s+(.+)$/i.exec(c.req.header('Authorization') ?? '');
    let sub: unknown;
    try {
      sub = m && (await verify(m[1], secret, 'HS256')).sub;
    } catch {
      sub = null;
    }
    if (typeof sub !== 'string' || !exists.get(sub)) throw new HTTPException(401, { message: 'unauthorized' });
    c.set('chamberId', sub);
    await next();
  };
}
