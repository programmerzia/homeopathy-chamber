import { useState } from 'react';
import { FlatList, Modal, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { confirm, useData } from '@/lib/hooks';
import { allPhotos, getPatient, patientPhotos } from '@/lib/repo';
import { remove } from '@/lib/db';
import { L, n } from '@/lib/i18n';
import type { KhataPhoto } from '@/lib/types';
import { Empty, Header, Press, T } from '@/ui/kit';
import { Icon } from '@/ui/Icon';
import { KhataImage } from '@/ui/Photo';
import { C } from '@/ui/theme';

type Item = KhataPhoto & { name?: string };

export default function Photos() {
  const { pid, open } = useLocalSearchParams<{ pid?: string; open?: string }>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const list = useData<Item[]>(() => (pid ? patientPhotos(pid) : allPhotos()), [pid], ['khata_photos']);
  const [viewer, setViewer] = useState<number | null>(() => {
    const i = open ? list.findIndex((p) => p.id === open) : -1;
    return i >= 0 ? i : null;
  });
  const p = pid ? getPatient(pid) : null;
  const size = (width - 40 - 20) / 3;
  const caption = (ph: Item) => `${ph.name ? ph.name + ' · ' : ''}${ph.year ? n(ph.year) + ' · ' : ''}${L(`পাতা ${n(ph.page)}`, `page ${ph.page}`)}`;

  const del = async (ph: Item) => {
    if (await confirm(L('ছবি মুছবেন?', 'Delete photo?'), caption(ph), L('মুছুন', 'Delete'))) {
      remove('khata_photos', ph.id);
      setViewer(null);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header
        title={p ? L(`${p.name} — খাতা`, `${p.name} — notebook`) : L('খাতার ছবি', 'Notebook photos')}
        right={
          <Press accessibilityLabel={L('ছবি তুলুন', 'Take photo')} onPress={() => router.push({ pathname: '/khata', params: pid ? { pid } : {} })} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="camera" size={24} color={C.primary} />
          </Press>
        }
      />
      <FlatList
        data={list}
        numColumns={3}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: 20, gap: 10 }}
        columnWrapperStyle={{ gap: 10 }}
        ListEmptyComponent={<Empty icon="camera" text={L('এখনো কোনো ছবি নেই', 'No photos yet')} />}
        renderItem={({ item, index }) => (
          <Press onPress={() => setViewer(index)} style={{ width: size, gap: 4 }}>
            <KhataImage photo={item} style={{ width: size, height: size * 1.26, borderRadius: 8, backgroundColor: C.paper }} />
            <T size={12} color={C.muted} lines={1}>{caption(item)}</T>
          </Press>
        )}
      />
      <Modal visible={viewer !== null} animationType="fade" onRequestClose={() => setViewer(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: C.camera }}>
          <FlatList
            data={list}
            horizontal
            pagingEnabled
            initialScrollIndex={viewer ?? 0}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(x) => x.id}
            onMomentumScrollEnd={(e) => setViewer(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => <KhataImage photo={item} contentFit="contain" style={{ width, height }} />}
          />
          <View style={{ position: 'absolute', top: insets.top + 8, left: 8, right: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Press accessibilityLabel={L('বন্ধ করুন', 'Close')} onPress={() => setViewer(null)} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" size={26} color="#FFFFFF" />
            </Press>
            {viewer !== null && list[viewer] && <T color="#FFFFFF" w={600}>{caption(list[viewer])}</T>}
            <Press accessibilityLabel={L('মুছুন', 'Delete')} onPress={() => viewer !== null && list[viewer] && del(list[viewer])} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="trash" size={24} color="#FFFFFF" />
            </Press>
          </View>
        </View>
      </Modal>
    </View>
  );
}
