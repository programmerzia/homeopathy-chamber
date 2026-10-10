import { useState } from 'react';
import { View } from 'react-native';
import { api, ApiError, syncNow, syncState } from '@/lib/sync';
import { prefs, useStore } from '@/lib/store';
import { confirm, toast } from '@/lib/hooks';
import { getChamber } from '@/lib/repo';
import { db } from '@/lib/db';
import { ago, L, normPhone } from '@/lib/i18n';
import { Btn, Field, Header, Row, Screen, Segmented, T } from '@/ui/kit';
import { Icon } from '@/ui/Icon';
import { C } from '@/ui/theme';

type Mode = 'register' | 'login';

export default function Backup() {
  const p = useStore(prefs, (s) => s);
  const sync = useStore(syncState, (s) => s);
  const [mode, setMode] = useState<Mode>('register');
  const [server, setServer] = useState(p.apiUrl);
  const [phone, setPhone] = useState(getChamber().phone);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const connect = async () => {
    setErr('');
    const url = server.trim().replace(/\/$/, '');
    if (!/^https?:\/\//.test(url)) return setErr(L('সার্ভারের ঠিকানা http:// দিয়ে শুরু হবে', 'Server address must start with http://'));
    if (!/^\d{4,6}$/.test(pin)) return setErr(L('৪-৬ সংখ্যার পিন দিন', 'Enter a 4–6 digit PIN'));
    setBusy(true);
    prefs.set({ apiUrl: url, token: '' });
    try {
      const ch = getChamber();
      const body = mode === 'register' ? { phone: normPhone(phone), pin, chamberName: ch.chamberName || 'Chamber', doctorName: ch.doctorName || undefined } : { phone: normPhone(phone), pin };
      const res = await api<{ token: string }>(`/auth/${mode}`, { method: 'POST', json: body });
      // a fresh account starts from revision 0 and uploads everything this phone has
      db.execSync(`UPDATE patients SET dirty=1; UPDATE visits SET dirty=1; UPDATE payments SET dirty=1; UPDATE expenses SET dirty=1;
        UPDATE queue SET dirty=1; UPDATE khata_photos SET dirty=1, uploaded=0; UPDATE settings SET dirty=1; UPDATE templates SET dirty=1;
        UPDATE medicines SET dirty=1 WHERE updated_at>0; UPDATE diseases SET dirty=1 WHERE updated_at>0; UPDATE advice SET dirty=1 WHERE updated_at>0;`);
      prefs.set({ token: res.token, lastRev: 0 });
      toast(L('ব্যাকআপ চালু হয়েছে', 'Backup is on'));
      syncNow();
    } catch (e) {
      const s = e instanceof ApiError ? e.status : 0;
      setErr(
        s === 409 ? L('এই নম্বরে আগেই অ্যাকাউন্ট আছে — “লগইন” বাছুন', 'Account exists — choose “Log in”')
          : s === 401 ? L('নম্বর বা পিন ভুল', 'Wrong number or PIN')
          : s === 429 ? L('অনেকবার চেষ্টা হয়েছে, ১৫ মিনিট পর আবার', 'Too many tries, wait 15 minutes')
          : L('সার্ভারে যোগাযোগ হয়নি — ইন্টারনেট দেখুন', 'Could not reach server — check internet'),
      );
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    if (await confirm(L('ব্যাকআপ বন্ধ করবেন?', 'Turn off backup?'), L('তথ্য এই ফোনে থেকে যাবে।', 'Data stays on this phone.'), L('বন্ধ করুন', 'Turn off'))) prefs.set({ token: '', lastRev: 0 });
  };

  if (p.token) {
    return (
      <View style={{ flex: 1 }}>
        <Header title={L('অনলাইন ব্যাকআপ', 'Online backup')} />
        <Screen>
          <Row gap={12} style={{ padding: 16, backgroundColor: C.primarySoft, borderRadius: 16 }}>
            <Icon name="cloudCheck" size={28} color={C.primaryInk} />
            <View style={{ flex: 1 }}>
              <T size={18} w={700} color={C.primaryInk}>{L('ব্যাকআপ চালু আছে', 'Backup is on')}</T>
              <T size={15} color={C.safeText}>{sync.running ? L('ব্যাকআপ হচ্ছে…', 'Backing up…') : p.lastBackupAt ? L(`শেষ ব্যাকআপ: ${ago(p.lastBackupAt)}`, `Last backup: ${ago(p.lastBackupAt)}`) : '—'}</T>
              {!!sync.error && <T size={14} color={C.dangerInk}>{sync.error}</T>}
            </View>
          </Row>
          <T size={15} color={C.muted}>{L('নতুন ফোনে একই নম্বর ও পিন দিয়ে লগইন করলে সব তথ্য ফিরে আসবে।', 'Log in with the same number and PIN on a new phone to get everything back.')}</T>
          <Btn icon="refresh" label={L('এখনই ব্যাকআপ নিন', 'Back up now')} disabled={sync.running} onPress={syncNow} />
          <Btn kind="danger" label={L('ব্যাকআপ বন্ধ করুন', 'Turn off backup')} onPress={logout} />
        </Screen>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Header title={L('অনলাইন ব্যাকআপ', 'Online backup')} />
      <Screen>
        <T size={16} color={C.muted}>{L('ফোন হারালেও তথ্য হারাবে না। ইন্টারনেট থাকলে নিজে থেকেই ব্যাকআপ হবে।', "Keep data safe even if the phone is lost. Backs up automatically when online.")}</T>
        <Segmented<Mode> options={[{ v: 'register', label: L('নতুন অ্যাকাউন্ট', 'New account') }, { v: 'login', label: L('লগইন', 'Log in') }]} value={mode} onChange={setMode} />
        <Field label={L('মোবাইল নম্বর', 'Mobile number')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label={L('পিন (৪-৬ সংখ্যা)', 'PIN (4–6 digits)')} value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={6} />
        <Field label={L('সার্ভারের ঠিকানা', 'Server address')} value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://…" />
        {!!err && <T size={15} color={C.danger}>{err}</T>}
        <Btn label={busy ? L('অপেক্ষা করুন…', 'Please wait…') : mode === 'register' ? L('ব্যাকআপ চালু করুন', 'Turn on backup') : L('লগইন করুন', 'Log in')} disabled={busy} onPress={connect} />
      </Screen>
    </View>
  );
}
