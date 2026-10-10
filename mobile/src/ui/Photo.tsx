import { memo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { prefs } from '@/lib/store';
import type { KhataPhoto } from '@/lib/types';
import { C } from './theme';

/** Local file when this device took the photo, otherwise the backed-up copy from the server. */
export function photoSource(p: Pick<KhataPhoto, 'id' | 'uri'>) {
  if (p.uri) return { uri: p.uri };
  const { apiUrl, token } = prefs.get();
  if (!apiUrl) return null;
  return { uri: `${apiUrl.replace(/\/$/, '')}/photos/${p.id}`, headers: { Authorization: `Bearer ${token}` }, cacheKey: p.id };
}

export const KhataImage = memo(function KhataImage({ photo, style, contentFit = 'cover' }: { photo: Pick<KhataPhoto, 'id' | 'uri'>; style: StyleProp<any>; contentFit?: 'cover' | 'contain' }) {
  const src = photoSource(photo);
  if (!src) return <PaperPlaceholder style={style} />;
  return <Image source={src} style={style} contentFit={contentFit} transition={120} recyclingKey={photo.id} cachePolicy="memory-disk" />;
});

/** The ruled-paper look from the mock, used when an image is not available on this device. */
export function PaperPlaceholder({ style, lines = 6 }: { style?: StyleProp<ViewStyle>; lines?: number }) {
  const widths = ['80%', '65%', '90%', '50%', '75%', '60%', '88%', '55%', '92%', '64%', '80%', '48%'] as const;
  return (
    <View style={[{ backgroundColor: C.paper, borderWidth: 1, borderColor: C.paperBorder, borderRadius: 8, padding: 12, gap: 9 }, style]}>
      {widths.slice(0, lines).map((w, i) => (
        <View key={i} style={{ height: 2, width: w, backgroundColor: C.paperLine, borderRadius: 1 }} />
      ))}
    </View>
  );
}
