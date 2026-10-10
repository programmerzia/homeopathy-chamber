import { memo } from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { C } from './theme';

// Stroke icons lifted from the mock (24×24 grid).
const P = (d: string) => <Path d={d} />;
const ICONS = {
  close: P('M6 6l12 12M18 6 6 18'),
  mic: <><Rect x={9} y={3} width={6} height={11} rx={3} />{P('M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21')}</>,
  check: P('m5 12.5 4.5 4.5L19 7.5'),
  chevronDown: P('m6 9 6 6 6-6'),
  chevronRight: P('m9 6 6 6-6 6'),
  back: P('M15 5l-7 7 7 7'),
  gallery: <><Rect x={3.5} y={4.5} width={17} height={15} rx={2} /><Circle cx={9} cy={10} r={1.8} />{P('m20.5 16-5-5-8 8.5')}</>,
  globe: <><Circle cx={12} cy={12} r={8.5} />{P('M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17')}</>,
  search: <><Circle cx={11} cy={11} r={6.5} />{P('m20 20-4.2-4.2')}</>,
  userPlus: <><Circle cx={9} cy={8} r={3.5} />{P('M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M19 8v6M16 11h6')}</>,
  users: <><Circle cx={9} cy={8} r={3.5} />{P('M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.8a3.2 3.2 0 0 1 0 6.4M18 14.8c1.8.6 3 2.3 3.5 5.2')}</>,
  list: P('M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01'),
  arrowRight: P('M5 12h14M13 6l6 6-6 6'),
  calendar: <><Rect x={3.5} y={5} width={17} height={15.5} rx={2} />{P('M3.5 10h17M8 3v4M16 3v4')}</>,
  camera: <>{P('M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z')}<Circle cx={12} cy={13.5} r={3.5} /></>,
  medicine: <>{P('M8 3h8v3H8zM7 6h10v13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z')}{P('M7 11h10')}</>,
  wallet: <>{P('M3 7.5A2.5 2.5 0 0 1 5.5 5H18v3')}<Rect x={3} y={8} width={18} height={12} rx={2} /><Circle cx={16.5} cy={14} r={1.3} /></>,
  message: P('M4 5h16v11H9l-5 4z'),
  printer: P('M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z'),
  store: P('M4 10v10h16V10M3 10l2-6h14l2 6zM10 20v-5h4v5'),
  bell: <>{P('M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z')}{P('M10 20.5a2 2 0 0 0 4 0')}</>,
  home: P('M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'),
  plus: P('M12 5v14M5 12h14'),
  grid: <><Rect x={4} y={4} width={6.5} height={6.5} rx={1.5} /><Rect x={13.5} y={4} width={6.5} height={6.5} rx={1.5} /><Rect x={4} y={13.5} width={6.5} height={6.5} rx={1.5} /><Rect x={13.5} y={13.5} width={6.5} height={6.5} rx={1.5} /></>,
  globule: <><Circle cx={8} cy={9} r={3} /><Circle cx={16} cy={9} r={3} /><Circle cx={12} cy={16} r={3} /></>,
  tablet: <><Rect x={3.5} y={8} width={17} height={8} rx={4} />{P('M12 8v8')}</>,
  drop: P('M12 3.5c3 4 6 7.2 6 10.5a6 6 0 0 1-12 0c0-3.3 3-6.5 6-10.5z'),
  mother: <>{P('M9 3h6M10 3v4l-3 4v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8l-3-4V3')}{P('M7 14h10')}</>,
  lm: <>{P('M12 3.5c3 4 6 7.2 6 10.5a6 6 0 0 1-12 0c0-3.3 3-6.5 6-10.5z')}{P('M9 14h6')}</>,
  syrup: <><Ellipse cx={12} cy={7.5} rx={4} ry={4.5} />{P('M12 12v9')}</>,
  powder: <>{P('M4 8h16l-2 12H6z')}{P('M4 8l3-4h10l3 4')}</>,
  ointment: <>{P('M8 3h8v3l-1.5 15h-5L8 6z')}{P('M8 6h8')}</>,
  morning: P('M4 18h16M7 18a5 5 0 0 1 10 0M12 8V4M5.6 11.6 4.2 10.2M18.4 11.6l1.4-1.4'),
  noon: <><Circle cx={12} cy={12} r={4} />{P('M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4')}</>,
  night: P('M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'),
  eyeOff: <>{P('M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 8.5 4.5 9.5 6-.5.8-1.6 2.3-3.1 3.6M6.4 7.4C4.6 8.7 3.2 10.6 2.5 12c1 1.5 4.5 6 9.5 6 1.5 0 2.9-.4 4.1-1')}{P('M9.9 9.9a3 3 0 0 0 4.2 4.2')}</>,
  share: <><Circle cx={6} cy={12} r={2.5} /><Circle cx={18} cy={6} r={2.5} /><Circle cx={18} cy={18} r={2.5} />{P('m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6')}</>,
  tag: <>{P('M3 12V4h8l10 10-8 8z')}<Circle cx={7.5} cy={8.5} r={1.3} /></>,
  phone: P('M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z'),
  book: <>{P('M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z')}{P('M5 18a2 2 0 0 1 2-2h11')}</>,
  lock: <><Rect x={5} y={10.5} width={14} height={10} rx={2} />{P('M8 10.5V8a4 4 0 0 1 8 0v2.5')}</>,
  cloudCheck: <>{P('M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.5A3.8 3.8 0 0 1 17.5 18z')}{P('m9.5 13.5 2 2 3.5-4')}</>,
  cloud: P('M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.5A3.8 3.8 0 0 1 17.5 18z'),
  refresh: P('M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15M4 20v-5h5'),
  edit: <>{P('M4 20h4L19 9l-4-4L4 16z')}{P('m13.5 6.5 4 4')}</>,
  cash: <><Rect x={2.5} y={6.5} width={19} height={11} rx={1.5} /><Circle cx={12} cy={12} r={2.5} />{P('M6 9.5v5M18 9.5v5')}</>,
  mobile: <><Rect x={7} y={2.5} width={10} height={19} rx={2} />{P('M11 18.5h2')}</>,
  bookmark: P('M6 3.5h12v17l-6-4-6 4z'),
  trash: <>{P('M4 7h16M10 11v6M14 11v6M9 7V4h6v3')}{P('M6 7l1 13h10l1-13')}</>,
  clip: P('m20 11.5-8.2 8.2a5 5 0 0 1-7-7L13 4.5a3.3 3.3 0 0 1 4.7 4.7l-8.2 8.2a1.7 1.7 0 0 1-2.4-2.4l7.6-7.6'),
  excel: <>{P('M6 3h9l4 4v14H6z')}{P('M9 11l5 6M14 11l-5 6')}</>,
  info: <><Circle cx={12} cy={12} r={8.5} />{P('M12 11v5M12 8h.01')}</>,
} as const;

export type IconName = keyof typeof ICONS;

export const Icon = memo(function Icon({ name, size = 24, color = C.ink, sw = 2 }: { name: IconName; size?: number; color?: string; sw?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </Svg>
  );
});
