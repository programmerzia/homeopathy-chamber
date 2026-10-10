# Homeopathy Chamber

Bengali-first practice app for a homeopathy chamber: patients, serial queue, 3-step consultation
(problem → medicine → payment), prescriptions, dues, notebook (khata) photos, medicine stock and money.

```
mobile/    Expo SDK 57 app (expo-router, expo-sqlite) — offline-first, works with no internet
backend/   Minimal Hono + node:sqlite server — backup/sync, photo storage, SMS reminders
tests/     End-to-end smoke test of the app's data layer + sync against the real backend
```

## How it fits together

- **The phone is the source of truth.** Every screen reads local SQLite synchronously, so it opens
  instantly and the chamber keeps working when the internet drops.
- **Sync is optional.** After "অনলাইন ব্যাকআপ" is turned on (phone + PIN), changed rows are pushed and
  new rows pulled every few seconds after an edit, every 5 minutes, and when the app returns to the
  foreground. Conflicts resolve last-write-wins per row. The server stores rows as opaque JSON, so the
  app's schema can change without server migrations.
- **Dues are derived, never typed in:** `due = Σ(fee + medicine − discount − paid) − Σ(collected)`.
  They are recomputed after every save and every sync pull, so two phones can't disagree.
- **SMS:** "আগের দিন রিমাইন্ডার" is sent by the server (BulkSMSBD adapter, console by default). Sending
  a prescription or a due reminder from the doctor's own SIM goes through the phone's SMS app.

## Run

Requires Node 24 (`nvm use 24`).

```bash
# backend
cd backend && npm install && cp .env.example .env   # set JWT_SECRET
npm run dev                                          # http://localhost:8787

# mobile
cd mobile && npm install
cp .env.example .env        # EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:8787
npx expo run:android        # development build (camera, voice and print need native modules)
```

Expo Go can open most of the app, but voice dictation (`expo-speech-recognition`) needs a
development build. In Expo Go the mic buttons fall back to a hint to use the keyboard's mic.

## Checks

```bash
cd mobile  && npx tsc --noEmit && npx expo lint && npx expo-doctor
cd backend && npm test && npm run typecheck
node tests/smoke/run.mjs     # real SQL, dues maths, dose text, prescription, sync round-trip
```
