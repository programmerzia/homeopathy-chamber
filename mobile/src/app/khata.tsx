import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Directory, File, Paths } from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { uid } from '@/lib/db';
import { addPhoto, getPatient } from '@/lib/repo';
import { pickStore } from '@/lib/pick';
import { useStore } from '@/lib/store';
import { toast } from '@/lib/hooks';
import { L, n, prettyPhone } from '@/lib/i18n';
import { Avatar, Btn, Chip, HScroll, Press, T } from '@/ui/kit';
import { Icon } from '@/ui/Icon';
import { C } from '@/ui/theme';

const dir = new Directory(Paths.document, 'khata');

/** Copy a captured/picked image into app storage so it survives cache clears. */
function persist(uri: string) {
  if (!dir.exists) dir.create({ intermediates: true });
  const id = uid();
  const dest = new File(dir, `${id}.jpg`);
  new File(uri).copy(dest);
  return { id, uri: dest.uri };
}

export default function Khata() {
  const params = useLocalSearchParams<{ pid?: string }>();
  const insets = useSafeAreaInsets();
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const pickedPid = useStore(pickStore, (s) => s.khataPid);
  const pid = params.pid || pickedPid;
  const p = pid ? getPatient(pid) : null;
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState<number | null>(thisYear);
  const [taken, setTaken] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!params.pid) pickStore.set({ khataPid: '' });
    if (perm && !perm.granted && perm.canAskAgain) requestPerm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perm?.granted]);

  const needPatient = () => {
    toast(L('আগে রোগী বাছুন', 'Choose the patient first'));
    router.push({ pathname: '/pick-patient', params: { mode: 'khata' } });
  };
  const store = (uri: string) => {
    const { id, uri: saved } = persist(uri);
    addPhoto(pid!, year, saved, id);
    setTaken((t) => t + 1);
  };
  const shoot = async () => {
    if (!pid) return needPatient();
    if (!cam.current || busy) return;
    setBusy(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const pic = await cam.current.takePictureAsync({ quality: 0.6, skipProcessing: false });
      if (pic?.uri) store(pic.uri);
    } catch {
      toast(L('ছবি তোলা যায়নি', 'Could not take photo'));
    } finally {
      setBusy(false);
    }
  };
  const gallery = async () => {
    if (!pid) return needPatient();
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.6 });
    if (!res.canceled) res.assets.forEach((a) => store(a.uri));
  };

  const years = [thisYear - 3, thisYear - 2, thisYear - 1, thisYear];

  return (
    <View style={{ flex: 1, backgroundColor: C.camera }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: insets.top + 12, paddingHorizontal: 12, paddingLeft: 6, paddingBottom: 8 }}>
        <Press accessibilityLabel={L('বন্ধ করুন', 'Close')} onPress={() => router.back()} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={26} color="#FFFFFF" />
        </Press>
        <T size={19} w={700} color="#FFFFFF">{L('খাতার ছবি তুলুন', 'Photograph notebook')}</T>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999 }}>
          <T size={15} color="#FFFFFF">{L(`${n(taken)}টি তোলা`, `${taken} taken`)}</T>
        </View>
      </View>

      <View style={{ flex: 1, alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999 }}>
          <T size={16} color="#FFFFFF">{L('খাতার পাতাটি সাদা দাগের ভেতরে রাখুন', 'Keep the page inside the white corners')}</T>
        </View>
        <View style={{ flex: 1, width: '100%', maxWidth: 340, borderRadius: 12, overflow: 'hidden' }}>
          {perm?.granted ? (
            <CameraView ref={cam} style={{ flex: 1 }} facing="back" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}>
              <T color="#FFFFFF" center>{L('ক্যামেরার অনুমতি দরকার', 'Camera permission needed')}</T>
              <Btn kind="white" h={48} size={16} label={L('অনুমতি দিন', 'Allow')} onPress={requestPerm} />
            </View>
          )}
          {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
            <View key={c} pointerEvents="none" style={{
              position: 'absolute', width: 34, height: 34, borderColor: '#FFFFFF',
              top: c[0] === 't' ? 0 : undefined, bottom: c[0] === 'b' ? 0 : undefined, left: c[1] === 'l' ? 0 : undefined, right: c[1] === 'r' ? 0 : undefined,
              borderTopWidth: c[0] === 't' ? 4 : 0, borderBottomWidth: c[0] === 'b' ? 4 : 0, borderLeftWidth: c[1] === 'l' ? 4 : 0, borderRightWidth: c[1] === 'r' ? 4 : 0,
              borderTopLeftRadius: c === 'tl' ? 10 : 0, borderTopRightRadius: c === 'tr' ? 10 : 0, borderBottomLeftRadius: c === 'bl' ? 10 : 0, borderBottomRightRadius: c === 'br' ? 10 : 0,
            }} />
          ))}
        </View>
      </View>

      <View style={{ gap: 14, paddingTop: 18, paddingHorizontal: 20, paddingBottom: Math.max(24, insets.bottom + 12), backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        <View style={{ gap: 6 }}>
          <T size={16} w={700}>{L('কোন রোগীর খাতা?', 'Whose notebook?')}</T>
          <Press disabled={!!params.pid} onPress={() => router.push({ pathname: '/pick-patient', params: { mode: 'khata' } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 54, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: p ? C.line : C.primary }}>
            {p ? <Avatar name={p.name} size={34} /> : <Icon name="users" size={22} color={C.primary} />}
            <T size={17} w={600} style={{ flex: 1 }} lines={1} color={p ? C.ink : C.primary}>{p ? `${p.name} · ${prettyPhone(p.phone)}` : L('রোগী বাছুন', 'Choose patient')}</T>
            {!params.pid && <Icon name="chevronDown" size={20} color={C.muted} />}
          </Press>
        </View>
        <View style={{ gap: 6 }}>
          <T size={16} w={700}>{L('কোন সালের লেখা?', 'Which year?')}</T>
          <HScroll>
            {years.map((y) => <Chip key={y} label={n(y)} on={year === y} onPress={() => setYear(y)} />)}
            <Chip label={L('জানি না', "Don't know")} on={year === null} onPress={() => setYear(null)} />
          </HScroll>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
          <Press onPress={gallery} style={{ width: 72, height: 64, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Icon name="gallery" size={26} />
            <T size={14} w={600}>{L('গ্যালারি', 'Gallery')}</T>
          </Press>
          <Press accessibilityLabel={L('ছবি তুলুন', 'Take photo')} onPress={shoot} style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 5, borderColor: C.primary, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
            <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: C.primary }} />
          </Press>
          <Press onPress={() => (pid && !params.pid ? router.replace(`/patient/${pid}`) : router.back())} style={{ width: 72, height: 52, borderRadius: 14, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <T size={17} w={700} color={C.primaryInk}>{L('শেষ', 'Done')}</T>
          </Press>
        </View>
      </View>
    </View>
  );
}
