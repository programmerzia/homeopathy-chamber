import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { setup } from './helpers.ts';

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test('upload, fetch, replace, isolation between chambers', async () => {
  const { req, register, dataDir } = setup();
  const a = await register('01711111111');
  const b = await register('01722222222');

  const put = await req('PUT', '/photos/khata_1', jpeg, a.token, { 'Content-Type': 'image/jpeg' });
  assert.equal(put.status, 200);
  assert.deepEqual(await put.json(), { url: '/photos/khata_1' });
  assert.ok(existsSync(join(dataDir, 'photos', a.chamber.id, 'khata_1.jpg')));

  const get = await req('GET', '/photos/khata_1', undefined, a.token);
  assert.equal(get.status, 200);
  assert.equal(get.headers.get('content-type'), 'image/jpeg');
  assert.equal(get.headers.get('cache-control'), 'private, max-age=31536000, immutable');
  assert.deepEqual(new Uint8Array(await get.arrayBuffer()), jpeg);

  // Other chamber cannot see it, and unauthenticated access is refused.
  assert.equal((await req('GET', '/photos/khata_1', undefined, b.token)).status, 404);
  assert.equal((await req('GET', '/photos/khata_1')).status, 401);

  // Same id in chamber B is a separate file.
  assert.equal((await req('PUT', '/photos/khata_1', png, b.token, { 'Content-Type': 'image/png' })).status, 200);
  assert.equal((await req('GET', '/photos/khata_1', undefined, b.token)).headers.get('content-type'), 'image/png');
  assert.equal((await req('GET', '/photos/khata_1', undefined, a.token)).headers.get('content-type'), 'image/jpeg');

  // Replacing with a different format removes the old file.
  assert.equal((await req('PUT', '/photos/khata_1', png, a.token, { 'Content-Type': 'image/png' })).status, 200);
  assert.ok(!existsSync(join(dataDir, 'photos', a.chamber.id, 'khata_1.jpg')));
});

test('rejects bad ids, types and oversized bodies', async () => {
  const { req, register } = setup();
  const { token } = await register();
  assert.equal((await req('PUT', '/photos/bad.id', jpeg, token, { 'Content-Type': 'image/jpeg' })).status, 400);
  assert.equal((await req('PUT', '/photos/ok', jpeg, token, { 'Content-Type': 'image/gif' })).status, 415);
  assert.equal((await req('PUT', '/photos/ok', png, token, { 'Content-Type': 'image/jpeg' })).status, 400);
  const big = new Uint8Array(8 * 1024 * 1024 + 1);
  big.set(jpeg);
  assert.equal((await req('PUT', '/photos/ok', big, token, { 'Content-Type': 'image/jpeg' })).status, 413);
  assert.equal((await req('GET', '/photos/missing', undefined, token)).status, 404);
});
