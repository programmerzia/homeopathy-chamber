import { useState } from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { iso, parseIso, today } from '@/lib/i18n';
import { Chip } from './kit';

/** A "pick date" chip: native dialog on Android, inline calendar on iOS. */
export function DatePickChip({ label, value, onChange, on }: { label: string; value: string | null; onChange: (d: string) => void; on?: boolean }) {
  const [open, setOpen] = useState(false);
  const current = value ? parseIso(value) : new Date();
  const min = parseIso(today());
  const press = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: current, mode: 'date', minimumDate: min, onChange: (e, d) => e.type === 'set' && d && onChange(iso(d)) });
    } else setOpen((o) => !o);
  };
  return (
    <>
      <Chip kind={on ? 'sel' : 'dashed'} on={on} label={label} onPress={press} />
      {open && Platform.OS !== 'android' && (
        <View style={{ width: '100%' }}>
          <DateTimePicker value={current} mode="date" display="inline" minimumDate={min} onChange={(_, d) => { if (d) onChange(iso(d)); setOpen(false); }} />
        </View>
      )}
    </>
  );
}
