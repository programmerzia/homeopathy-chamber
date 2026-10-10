import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalisePhone } from '../src/auth.ts';
import { setup } from './helpers.ts';

test('normalisePhone', () => {
  assert.equal(normalisePhone('01712345678'), '01712345678');
  assert.equal(normalisePhone('+880 1712-345678'), '01712345678');
  assert.equal(normalisePhone('8801712345678'), '01712345678');
  assert.equal(normalisePhone('1712345678'), '01712345678');
  assert.equal(normalisePhone('01212345678'), null);
  assert.equal(normalisePhone('0171234567'), null);
});

test('register, login, me', async () => {
  const { req, register } = setup();
  const r = await register('+8801712345678', '1234', 'Shanti Homeo');
  assert.ok(r.token);
  assert.equal(r.chamber.name, 'Shanti Homeo');

  const dup = await req('POST', '/auth/register', { phone: '01712345678', pin: '9999', chamberName: 'X' });
  assert.equal(dup.status, 409);
  assert.ok((await dup.json()).error);

  const ok = await req('POST', '/auth/login', { phone: '01712-345678', pin: '1234' });
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.deepEqual(body.chamber, r.chamber);

  const me = await req('GET', '/me', undefined, body.token);
  assert.equal(me.status, 200);
  assert.deepEqual(await me.json(), { chamber: { id: r.chamber.id, name: 'Shanti Homeo', phone: '01712345678' }, rev: 0 });
});

test('validation and auth errors', async () => {
  const { req } = setup();
  assert.equal((await req('POST', '/auth/register', { phone: '123', pin: '1234', chamberName: 'X' })).status, 400);
  assert.equal((await req('POST', '/auth/register', { phone: '01712345678', pin: '12', chamberName: 'X' })).status, 400);
  assert.equal((await req('POST', '/auth/login', { phone: '01712345678', pin: '1234' })).status, 401);
  assert.equal((await req('GET', '/me')).status, 401);
  assert.equal((await req('GET', '/me', undefined, 'garbage')).status, 401);
  assert.deepEqual(await (await req('GET', '/health')).json(), { ok: true });
});

test('failed logins are rate limited per phone', async () => {
  const { req, register } = setup();
  await register('01812345678', '4321');
  for (let i = 0; i < 5; i++) assert.equal((await req('POST', '/auth/login', { phone: '01812345678', pin: '0000' })).status, 401);
  const blocked = await req('POST', '/auth/login', { phone: '01812345678', pin: '4321' });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  // other phones unaffected
  assert.equal((await req('POST', '/auth/login', { phone: '01912345678', pin: '0000' })).status, 401);
});
