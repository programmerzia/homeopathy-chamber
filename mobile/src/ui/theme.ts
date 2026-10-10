// Design tokens taken 1:1 from the mock.
export const C = {
  bg: '#F5F2EA',
  ink: '#17231E',
  body: '#2E3833',
  muted: '#55605A',
  surface: '#FFFFFF',
  border: '#E2DDD0',
  divider: '#EEEAE0',
  line: '#C9C2B0',
  dashed: '#9E977F',
  track: '#D9D3C4',
  segment: '#EAE5D8',
  footer: '#FBFAF6',

  primary: '#24493D',
  primaryInk: '#1F4A3A',
  primarySoft: '#E3ECE6',
  onPrimaryMuted: '#D4E2DA',
  bar2: '#4E7A69',
  bar3: '#8FB0A2',
  safeText: '#2F5446',
  safeBorder: '#9DB8AB',

  amberSoft: '#F6E9D3',
  amberInk: '#6B4210',
  amberDeep: '#5A3708',
  amberIcon: '#7A4A0B',
  warnBadge: '#E8B45A',
  warnBadgeInk: '#3D2604',

  dangerSoft: '#F7E1DA',
  dangerInk: '#8A2E17',
  danger: '#A33A1F',
  dangerBorder: '#E3B7A9',
  dangerDeep: '#5E1F10',

  sheetBackdrop: '#4A524E',
  sheetLabel: '#D9DED9',
  paper: '#FBF4E0',
  paperLine: '#B9AE92',
  paperBorder: '#E2D6B4',
  rxPaper: '#FFFEFB',
  rxBox: '#FBF4E4',
  camera: '#101714',
} as const;

export const R = { chip: 999, card: 16, input: 14, btn: 16, small: 12 } as const;

export const shadow = {
  seg: { shadowColor: '#17231E', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  fab: { shadowColor: '#24493D', shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  paper: { shadowColor: '#17231E', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
} as const;
