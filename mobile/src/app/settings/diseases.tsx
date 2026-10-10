import { useState } from 'react';
import { View } from 'react-native';
import { addDisease, listDiseases } from '@/lib/repo';
import { remove } from '@/lib/db';
import { confirm, useData } from '@/lib/hooks';
import { L } from '@/lib/i18n';
import { Btn, Header, Input, Press, Row, Screen, SearchBox, T } from '@/ui/kit';
import { Icon } from '@/ui/Icon';
import { C } from '@/ui/theme';

export default function Diseases() {
  const all = useData(listDiseases, [], ['diseases']);
  const [q, setQ] = useState('');
  const [bn, setBn] = useState('');
  const [en, setEn] = useState('');
  const shown = q ? all.filter((d) => d.name_bn.includes(q) || d.name_en.toLowerCase().includes(q.toLowerCase())) : all;

  return (
    <View style={{ flex: 1 }}>
      <Header title={L('রোগের তালিকা', 'Disease list')} />
      <Screen>
        <View style={{ gap: 8, padding: 16, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border }}>
          <T size={17} w={700}>{L('নতুন রোগ যোগ করুন', 'Add a disease')}</T>
          <Input value={bn} onChangeText={setBn} placeholder={L('বাংলা নাম', 'Bangla name')} style={{ height: 50 }} />
          <Input value={en} onChangeText={setEn} placeholder={L('ইংরেজি নাম (না দিলেও চলবে)', 'English name (optional)')} style={{ height: 50 }} />
          <Btn h={50} size={16} label={L('যোগ করুন', 'Add')} disabled={!bn.trim()} onPress={() => { addDisease(bn.trim(), en.trim()); setBn(''); setEn(''); }} />
        </View>
        <SearchBox value={q} onChangeText={setQ} placeholder={L('খুঁজুন', 'Search')} h={52} />
        <View style={{ backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
          {shown.map((d, i) => (
            <Row key={d.id} style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: i < shown.length - 1 ? 1 : 0, borderBottomColor: C.divider }}>
              <View style={{ flex: 1 }}>
                <T size={17} w={600}>{d.name_bn}</T>
                {!!d.name_en && <T size={14} color={C.muted}>{d.name_en}</T>}
              </View>
              {d.custom === 1 && (
                <Press accessibilityLabel={L('মুছুন', 'Delete')} hitSlop={8} onPress={async () => (await confirm(L('মুছবেন?', 'Delete?'), d.name_bn, L('মুছুন', 'Delete'))) && remove('diseases', d.id)}>
                  <Icon name="trash" size={20} color={C.muted} />
                </Press>
              )}
            </Row>
          ))}
        </View>
      </Screen>
    </View>
  );
}
