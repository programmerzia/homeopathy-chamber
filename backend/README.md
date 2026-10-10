# Homeopathy Chamber — backend

Minimal sync/backup server for the offline-first mobile app. The app keeps everything in local
SQLite; this server stores opaque row JSON per chamber, photos, and sends SMS.

Stack: Node 24 (runs TypeScript directly), Hono, zod, built-in `node:sqlite`.

## Run

```sh
nvm use 24
npm install
cp .env.example .env   # set JWT_SECRET
npm run dev            # watch mode;  npm start for production
npm test               # node:test, in-memory db
npm run typecheck
```

Docker: `docker build -t chamber-backend . && docker run -p 8787:8787 -e JWT_SECRET=... -v chamber-data:/data chamber-backend`

## Env

| var | default | |
|---|---|---|
| `PORT` | `8787` | |
| `DATA_DIR` | `./data` | `chamber.db` (SQLite, WAL) and `photos/<chamberId>/` |
| `JWT_SECRET` | dev secret + warning | **required** when `NODE_ENV=production` |
| `SMS_PROVIDER` | `console` | `console` (logs only) or `bulksmsbd` |
| `SMS_API_KEY`, `SMS_SENDER_ID` | | for `bulksmsbd` |
| `REMINDERS` | on | `off` disables the daily next-visit SMS job |

## API

Errors are `{error: string}`. All routes except `/health` and `/auth/*` need `Authorization: Bearer <token>` (HS256, `{sub: chamberId}`, 180 days).

- `GET /health` → `{ok: true}`
- `POST /auth/register` `{phone, pin, chamberName, doctorName?}` → 201 `{token, chamber: {id, name}}`; 409 if phone exists. Phone is a BD mobile (`017…`, `+880…` accepted), PIN 4–6 digits.
- `POST /auth/login` `{phone, pin}` → `{token, chamber}`; 401 bad credentials; 429 after 5 failures per phone in 15 min.
- `GET /me` → `{chamber: {id, name, phone}, rev}`
- `POST /sync` `{lastRev, changes: {[table]: Row[]}}` → `{rev, changes, serverTime, more?}`
  - Tables: `patients visits payments expenses medicines diseases advice templates queue khata_photos settings`.
  - Row: `{id (≤64 chars), updated_at (ms), deleted: 0|1, ...anything}`; stored whole as JSON.
  - Last-write-wins on `updated_at` (ties keep the server copy); each accepted write gets the next chamber rev.
  - Returns rows with `rev > lastRev`, excluding rows written by this request. At most 5000 rows; if
    more, `more: true` and `rev` is the last included rev — call again with `lastRev = rev`.
  - Body ≤ 10 MB.
- `PUT /photos/:id` raw `image/jpeg|image/png` body ≤ 8 MB → `{url: "/photos/<id>"}`; id `[A-Za-z0-9_-]{1,64}`.
- `GET /photos/:id` → image (own chamber only), `Cache-Control: private, max-age=31536000, immutable`.
- `POST /sms/send` `{messages: [{to, text}]}` (≤ 200) → `{sent, failed}`. Every attempt is logged in `sms_log`.

### Reminders

Hourly in-process job; once per Dhaka day after 10:00, for chambers whose `settings` row `chamber` has
`smsReminders: true`, texts each patient whose latest visit has `next_visit` = tomorrow (Dhaka).
"Latest" = highest `date` (or `visit_date`), then `created_at`, then `updated_at`. Deduplicated per
patient/day via `sms_log`.
