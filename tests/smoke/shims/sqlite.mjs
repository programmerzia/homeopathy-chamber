import { DatabaseSync } from 'node:sqlite';
const norm = (p) => (p ?? []).map((v) => (v === undefined ? null : v));
export function openDatabaseSync() {
  const d = new DatabaseSync(':memory:');
  const api = {
    execSync: (s) => d.exec(s),
    getAllSync: (s, p) => d.prepare(s).all(...norm(p)),
    getFirstSync: (s, p) => d.prepare(s).get(...norm(p)) ?? null,
    runSync: (s, p) => d.prepare(s).run(...norm(p)),
    withTransactionSync: (f) => { d.exec('BEGIN'); try { f(); d.exec('COMMIT'); } catch (e) { d.exec('ROLLBACK'); throw e; } },
    prepareSync: (s) => { const st = d.prepare(s); return { executeSync: (p) => st.run(...norm(p)), finalizeSync() {} }; },
  };
  return api;
}
