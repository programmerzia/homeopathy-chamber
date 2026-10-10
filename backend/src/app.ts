import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { authRoutes, requireAuth } from './auth.ts';
import type { DB } from './db.ts';
import type { AppEnv } from './http.ts';
import { photoRoutes } from './photos.ts';
import { consoleProvider, makeSender, smsRoutes, type SmsProvider } from './sms.ts';
import { syncRoutes } from './sync.ts';

export type AppOptions = { jwtSecret: string; dataDir: string; sms?: SmsProvider; log?: boolean };

const tooLarge = () => { throw new HTTPException(413, { message: 'request body too large' }); };

export function createApp(db: DB, opts: AppOptions) {
  const app = new Hono<AppEnv>();
  const auth = requireAuth(db, opts.jwtSecret);
  const meQ = db.prepare('SELECT id, name, phone, rev FROM chambers WHERE id = ?');

  if (opts.log) app.use(logger());
  app.use(cors());
  app.use('/sync', bodyLimit({ maxSize: 10 * 1024 * 1024, onError: tooLarge }));
  app.use('/auth/*', bodyLimit({ maxSize: 16 * 1024, onError: tooLarge }));
  app.use('/sms/*', bodyLimit({ maxSize: 1024 * 1024, onError: tooLarge }));
  for (const p of ['/me', '/sync', '/photos/*', '/sms/*']) app.use(p, auth);

  app.get('/health', (c) => c.json({ ok: true }));
  app.route('/auth', authRoutes(db, opts.jwtSecret));
  app.get('/me', (c) => {
    const { rev, ...chamber } = meQ.get(c.var.chamberId) as { id: string; name: string; phone: string; rev: number };
    return c.json({ chamber, rev });
  });
  app.route('/sync', syncRoutes(db));
  app.route('/photos', photoRoutes(opts.dataDir));
  app.route('/sms', smsRoutes(makeSender(db, opts.sms ?? consoleProvider)));

  app.notFound((c) => c.json({ error: 'not found' }, 404));
  app.onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message || 'error' }, err.status);
    console.error(err);
    return c.json({ error: 'internal server error' }, 500);
  });
  return app;
}
