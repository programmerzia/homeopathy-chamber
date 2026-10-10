import { memo, type ReactNode } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type PressableProps, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Icon, type IconName } from './Icon';
import { C, shadow } from './theme';
import { prefs } from '@/lib/store';
import { L } from '@/lib/i18n';

// ---------------- text ----------------
const SCALES = [0.9, 1, 1.15];
export const fs = (size: number) => Math.round(size * SCALES[prefs.get().scale]);
const FAMILY: Record<number, string> = {
  400: 'HindSiliguri_400Regular',
  500: 'HindSiliguri_500Medium',
  600: 'HindSiliguri_600SemiBold',
  700: 'HindSiliguri_700Bold',
};
type TProps = {
  children?: ReactNode;
  size?: number;
  w?: 400 | 500 | 600 | 700;
  color?: string;
  serif?: boolean;
  center?: boolean;
  lines?: number;
  style?: StyleProp<TextStyle>;
  selectable?: boolean;
};
export const T = memo(function T({ children, size = 17, w = 400, color = C.ink, serif, center, lines, style, selectable }: TProps) {
  const s = fs(size);
  return (
    <Text
      numberOfLines={lines}
      selectable={selectable}
      style={[
        { fontSize: s, lineHeight: Math.round(s * (serif ? 1.2 : 1.45)), color, fontFamily: serif ? 'Fraunces_600SemiBold' : FAMILY[w] },
        center && { textAlign: 'center' },
        { includeFontPadding: false },
        style,
      ]}
    >
      {children}
    </Text>
  );
});

// ---------------- press ----------------
export function Press({ style, haptic, onPress, ...p }: PressableProps & { style?: StyleProp<ViewStyle>; haptic?: boolean }) {
  return (
    <Pressable
      {...p}
      onPress={(e) => {
        if (haptic) Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      style={({ pressed }) => [style, pressed && { opacity: 0.72 }]}
    />
  );
}

// ---------------- layout ----------------
export function Screen({ children, scroll = true, pad = 20, gap = 18, bg = C.bg, top = false, footer, contentStyle }: {
  children: ReactNode; scroll?: boolean; pad?: number; gap?: number; bg?: string; top?: boolean; footer?: ReactNode; contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const body = { padding: pad, gap, paddingTop: top ? insets.top + 26 : pad };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: bg }}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[body, { paddingBottom: 32 }, contentStyle]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, body, contentStyle]}>{children}</View>
      )}
      {footer}
    </KeyboardAvoidingView>
  );
}

export function Header({ title, close, right, onBack }: { title: string; close?: boolean; right?: ReactNode; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      <Press
        accessibilityRole="button"
        accessibilityLabel={close ? L('বন্ধ করুন', 'Close') : L('ফিরে যান', 'Back')}
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        style={s.headerBtn}
        hitSlop={8}
      >
        <Icon name={close ? 'close' : 'back'} size={26} />
      </Press>
      <T size={19} w={700} lines={1} style={{ flexShrink: 1 }}>{title}</T>
      <View style={{ minWidth: 48, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function Footer({ children, bg = C.surface }: { children: ReactNode; bg?: string }) {
  const insets = useSafeAreaInsets();
  return <View style={[s.footer, { backgroundColor: bg, paddingBottom: Math.max(22, insets.bottom + 10) }]}>{children}</View>;
}

export const Row = ({ children, gap = 8, style, wrap }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, wrap && { flexWrap: 'wrap' }, style]}>{children}</View>
);
export const Col = ({ children, gap = 8, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ gap }, style]}>{children}</View>
);
export const H2 = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <T size={19} w={700} style={style}>{children}</T>;
export const H1 = ({ children }: { children: ReactNode }) => <T size={28} w={700} style={{ lineHeight: fs(35) }}>{children}</T>;
export const Card = ({ children, style, pad = 16, gap = 10 }: { children: ReactNode; style?: StyleProp<ViewStyle>; pad?: number; gap?: number }) => (
  <View style={[s.card, { padding: pad, gap }, style]}>{children}</View>
);
export const ListCard = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[s.card, { overflow: 'hidden' }, style]}>{children}</View>;
export const Divider = ({ style }: { style?: StyleProp<ViewStyle> }) => <View style={[{ height: 1, backgroundColor: C.border }, style]} />;
export const HScroll = ({ children, gap = 8, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={[{ marginHorizontal: -20, flexGrow: 0 }, style]} contentContainerStyle={{ gap, paddingHorizontal: 20 }}>
    {children}
  </ScrollView>
);

// ---------------- chips, tags ----------------
type ChipKind = 'default' | 'sel' | 'dashed' | 'amber' | 'soft';
export const Chip = memo(function Chip({ label, on, kind, big, onPress, icon }: { label: string; on?: boolean; kind?: ChipKind; big?: boolean; onPress?: () => void; icon?: IconName }) {
  const k: ChipKind = kind ?? (on ? 'sel' : 'default');
  const st = CHIP[k];
  return (
    <Press
      haptic
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      onPress={onPress}
      style={[s.chip, { height: big ? 44 : 40 }, st.box]}
    >
      {icon && <Icon name={icon} size={18} color={st.color} />}
      <T size={big ? 16 : 15} w={st.w} color={st.color}>{label}</T>
    </Press>
  );
});
const CHIP: Record<ChipKind, { box: ViewStyle; color: string; w: 500 | 600 | 700 }> = {
  default: { box: { borderWidth: 1, borderColor: C.line, backgroundColor: C.surface }, color: C.ink, w: 500 },
  sel: { box: { backgroundColor: C.primary }, color: '#FFFFFF', w: 600 },
  dashed: { box: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.dashed, backgroundColor: 'transparent' }, color: C.primary, w: 600 },
  amber: { box: { backgroundColor: C.amberSoft }, color: C.amberInk, w: 600 },
  soft: { box: { backgroundColor: C.primarySoft }, color: C.primaryInk, w: 700 },
};

type Tone = 'neutral' | 'amber' | 'danger' | 'green';
const TONE: Record<Tone, [string, string]> = {
  neutral: [C.divider, C.muted],
  amber: [C.amberSoft, C.amberInk],
  danger: [C.dangerSoft, C.dangerInk],
  green: [C.primarySoft, C.primaryInk],
};
export const Tag = memo(function Tag({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <View style={{ backgroundColor: TONE[tone][0], paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999 }}>
      <T size={14} w={600} color={TONE[tone][1]} lines={1}>{label}</T>
    </View>
  );
});

// ---------------- buttons ----------------
export function Btn({ label, onPress, icon, iconRight, kind = 'primary', h = 58, disabled, size = 19, style }: {
  label: string; onPress?: () => void; icon?: IconName; iconRight?: IconName; kind?: 'primary' | 'outline' | 'danger' | 'ghost' | 'white' | 'dashed'; h?: number; disabled?: boolean; size?: number; style?: StyleProp<ViewStyle>;
}) {
  const v = BTN[kind];
  return (
    <Press haptic accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.btn, { height: h }, v.box, disabled && { opacity: 0.45 }, style]}>
      {icon && <Icon name={icon} size={22} color={v.color} />}
      <T size={size} w={700} color={v.color}>{label}</T>
      {iconRight && <Icon name={iconRight} size={22} color={v.color} sw={2.2} />}
    </Press>
  );
}
const BTN = {
  primary: { box: { backgroundColor: C.primary }, color: '#FFFFFF' },
  outline: { box: { borderWidth: 1.5, borderColor: C.primary, backgroundColor: C.surface }, color: C.primary },
  danger: { box: { borderWidth: 1.5, borderColor: C.dangerBorder, backgroundColor: C.surface }, color: C.dangerInk },
  ghost: { box: { backgroundColor: 'transparent' }, color: C.primary },
  white: { box: { backgroundColor: C.surface }, color: C.primary },
  dashed: { box: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.dashed, backgroundColor: 'transparent' }, color: C.primary },
} as const;

export function Segmented<V extends string | number>({ options, value, onChange, h = 50 }: { options: { v: V; label: string }[]; value: V; onChange: (v: V) => void; h?: number }) {
  return (
    <View style={s.seg} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.v === value;
        return (
          <Press key={String(o.v)} haptic accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.v)} style={[s.segItem, { height: h }, on && { backgroundColor: C.surface, ...shadow.seg }]}>
            <T size={16} w={on ? 700 : 500} color={on ? C.ink : C.muted}>{o.label}</T>
          </Press>
        );
      })}
    </View>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Press haptic accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={[s.switch, value && { backgroundColor: C.primary }]}>
      <View style={[s.knob, value && { left: 25 }]} />
    </Press>
  );
}

export function Check({ on, size = 26 }: { on: boolean; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 6, borderWidth: on ? 0 : 2, borderColor: C.line, backgroundColor: on ? C.primary : C.surface, alignItems: 'center', justifyContent: 'center' }}>
      {on && <Icon name="check" size={size - 6} color="#FFFFFF" sw={3} />}
    </View>
  );
}

// ---------------- inputs ----------------
export function Field({ label, required, hint, ...p }: TextInputProps & { label: string; required?: boolean; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T size={17} w={700}>
        {label}
        {required && <T color={C.danger}> *</T>}
        {hint && <T size={15} color={C.muted}> {hint}</T>}
      </T>
      <Input {...p} />
    </View>
  );
}
export function Input(p: TextInputProps) {
  return <TextInput placeholderTextColor={C.muted} {...p} style={[s.input, { fontSize: fs(19), fontFamily: FAMILY[400] }, p.style]} />;
}

export function SearchBox({ value, onChangeText, placeholder, strong, onMic, autoFocus, onFocus, h = 58, inputRef }: {
  value: string; onChangeText: (t: string) => void; placeholder: string; strong?: boolean; onMic?: () => void; autoFocus?: boolean; onFocus?: () => void; h?: number; inputRef?: any;
}) {
  return (
    <View style={[s.search, { height: h, borderWidth: strong ? 2 : 1.5, borderColor: strong ? C.primary : C.line, paddingRight: onMic ? 6 : 16 }]}>
      <Icon name="search" size={22} sw={1.8} color={strong ? C.primary : C.muted} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        autoFocus={autoFocus}
        onFocus={onFocus}
        returnKeyType="search"
        accessibilityLabel={placeholder}
        style={{ flex: 1, fontSize: fs(17), fontFamily: FAMILY[400], color: C.ink, paddingVertical: 0 }}
      />
      {!!value && (
        <Press accessibilityLabel={L('মুছুন', 'Clear')} onPress={() => onChangeText('')} hitSlop={8} style={{ padding: 6 }}>
          <Icon name="close" size={18} color={C.muted} />
        </Press>
      )}
      {onMic && (
        <Press haptic accessibilityLabel={L('মুখে বলে খুঁজুন', 'Search by voice')} onPress={onMic} style={s.micBtn}>
          <Icon name="mic" size={22} color={C.primaryInk} />
        </Press>
      )}
    </View>
  );
}

// ---------------- misc ----------------
export function initial(name: string) {
  const cleaned = name.replace(/^(মোঃ|মো\.|মোছাঃ|Md\.?|Mst\.?)\s*/i, '').trim();
  return Array.from(cleaned)[0] ?? '?';
}
export const Avatar = memo(function Avatar({ name, size = 48, dark }: { name: string; size?: number; dark?: boolean }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: dark ? C.primary : C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <T size={Math.round(size * 0.41)} w={700} color={dark ? '#FFFFFF' : C.primaryInk} style={{ lineHeight: undefined }}>{initial(name)}</T>
    </View>
  );
});

export function Steps({ at }: { at: 1 | 2 | 3 }) {
  const labels = [L('সমস্যা', 'Problem'), L('ওষুধ', 'Medicine'), L('টাকা', 'Payment')];
  return (
    <View style={{ flexDirection: 'row', gap: 8 }} accessibilityLabel={L(`ধাপ ${at} এর ৩`, `Step ${at} of 3`)}>
      {labels.map((lb, i) => {
        const step = i + 1;
        const done = step < at;
        const cur = step === at;
        return (
          <View key={lb} style={{ flex: 1, gap: 6 }}>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: step <= at ? C.primary : C.track }} />
            <Row gap={6}>
              <View style={[s.stepDot, step <= at ? { backgroundColor: C.primary } : { borderWidth: 1.5, borderColor: C.line, backgroundColor: C.surface }]}>
                {done ? <Icon name="check" size={16} color="#FFFFFF" sw={2.6} /> : <T size={14} w={700} color={cur ? '#FFFFFF' : C.muted} style={{ lineHeight: undefined }}>{L(['১', '২', '৩'][i], String(step))}</T>}
              </View>
              <T size={16} w={cur ? 700 : 500} color={cur ? C.ink : done ? C.primaryInk : C.muted}>{lb}</T>
            </Row>
          </View>
        );
      })}
    </View>
  );
}

export function Empty({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 36 }}>
      <Icon name={icon} size={36} color={C.dashed} sw={1.6} />
      <T size={16} color={C.muted} center>{text}</T>
    </View>
  );
}

/** Bottom-sheet screen (used as a transparent modal route), matching the mock's dark backdrop + label. */
export function Sheet({ label, title, subtitle, children, footer, onClose }: { label?: string; title: ReactNode; subtitle?: string; children: ReactNode; footer?: ReactNode; onClose?: () => void }) {
  const insets = useSafeAreaInsets();
  const close = onClose ?? (() => router.back());
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(40,46,43,0.82)' }}>
      <Pressable accessibilityLabel={L('বন্ধ করুন', 'Close')} onPress={close} style={{ height: insets.top + 78, justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: 30 }}>
        {label && <T size={15} color={C.sheetLabel}>{label}</T>}
      </Pressable>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheet}>
        <View style={s.grabber} />
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 20, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18 }} showsVerticalScrollIndicator={false}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 0 }}>
              {typeof title === 'string' ? <T size={24} w={700}>{title}</T> : title}
              {subtitle && <T size={15} color={C.muted}>{subtitle}</T>}
            </View>
            <Press accessibilityLabel={L('বন্ধ করুন', 'Close')} onPress={close} style={s.sheetClose}>
              <Icon name="close" size={22} />
            </Press>
          </Row>
          {children}
        </ScrollView>
        {footer && <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(22, insets.bottom + 10), borderTopWidth: 1, borderTopColor: C.border }}>{footer}</View>}
      </KeyboardAvoidingView>
    </View>
  );
}

export const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 64, paddingBottom: 8, paddingLeft: 6, paddingRight: 12, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  headerBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, borderRadius: 999 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 16 },
  seg: { flexDirection: 'row', padding: 4, backgroundColor: C.segment, borderRadius: 14 },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  switch: { width: 54, height: 32, borderRadius: 16, backgroundColor: C.line },
  knob: { position: 'absolute', top: 3, left: 3, width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF' },
  input: { height: 58, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.surface, color: C.ink },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, backgroundColor: C.surface, borderRadius: 16 },
  micBtn: { width: 46, height: 46, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  sheet: { flex: 1, backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -18, overflow: 'hidden' },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: C.track, alignSelf: 'center', marginTop: 10 },
  sheetClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: C.divider },
});
