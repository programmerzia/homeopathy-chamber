import { createReadStream } from 'node:fs';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from './http.ts';

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = {
  jpg: { mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
  png: { mime: 'image/png', magic: [0x89, 0x50, 0x4e, 0x47] },
} as const;
type Ext = keyof typeof TYPES;
const EXTS = Object.keys(TYPES) as Ext[];

export function photoRoutes(dataDir: string) {
  const dirFor = (chamberId: string) => join(dataDir, 'photos', chamberId);
  const validId = (id: string) => {
    if (!ID_RE.test(id)) throw new HTTPException(400, { message: 'invalid photo id' });
    return id;
  };

  return new Hono<AppEnv>()
    .put(
      '/:id',
      bodyLimit({ maxSize: MAX_BYTES, onError: () => { throw new HTTPException(413, { message: 'photo too large (max 8 MB)' }); } }),
      async (c) => {
        const id = validId(c.req.param('id'));
        const mime = (c.req.header('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
        const ext = EXTS.find((e) => TYPES[e].mime === mime);
        if (!ext) throw new HTTPException(415, { message: 'Content-Type must be image/jpeg or image/png' });
        const buf = Buffer.from(await c.req.arrayBuffer());
        if (!TYPES[ext].magic.every((b, i) => buf[i] === b)) throw new HTTPException(400, { message: `body is not a valid ${mime}` });

        const dir = dirFor(c.var.chamberId);
        await mkdir(dir, { recursive: true });
        const tmp = join(dir, `.${id}.${process.pid}.${Date.now()}.tmp`);
        await writeFile(tmp, buf);
        await rename(tmp, join(dir, `${id}.${ext}`)); // atomic replace
        for (const other of EXTS) if (other !== ext) await rm(join(dir, `${id}.${other}`), { force: true });
        return c.json({ url: `/photos/${id}` });
      },
    )
    .get('/:id', async (c) => {
      const id = validId(c.req.param('id'));
      for (const ext of EXTS) {
        const path = join(dirFor(c.var.chamberId), `${id}.${ext}`);
        const st = await stat(path).catch(() => null);
        if (!st?.isFile()) continue;
        return c.body(Readable.toWeb(createReadStream(path)) as ReadableStream, 200, {
          'Content-Type': TYPES[ext].mime,
          'Content-Length': String(st.size),
          'Cache-Control': 'private, max-age=31536000, immutable',
        });
      }
      throw new HTTPException(404, { message: 'photo not found' });
    });
}
