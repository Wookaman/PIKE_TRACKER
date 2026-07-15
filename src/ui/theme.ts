import { Platform, TextStyle, ViewStyle } from 'react-native';

/** Monochrome XP-dark palette. The only colors allowed in the app. */
export const c = {
  bg: '#0b0b0d',
  surface: '#141417',
  raised: '#1e1e22',
  raisedHi: '#26262b',
  well: '#0f0f11',
  borderLight: '#3a3a40',
  borderDark: '#000000',
  text: '#e6e6ea',
  textDim: '#8a8a92',
  textFaint: '#55555c',
  white: '#ffffff',
  muscleIdle: '#232327',
  muscleSecondary: '#6a6a72',
} as const;

export const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

/** Raised chrome: light catches top/left, shadow falls bottom/right. */
export const bevelUp: ViewStyle = {
  backgroundColor: c.raised,
  borderWidth: 2,
  borderTopColor: c.borderLight,
  borderLeftColor: c.borderLight,
  borderBottomColor: c.borderDark,
  borderRightColor: c.borderDark,
};

/** Pressed / inset: light flips to bottom/right. */
export const bevelDown: ViewStyle = {
  backgroundColor: c.surface,
  borderWidth: 2,
  borderTopColor: c.borderDark,
  borderLeftColor: c.borderDark,
  borderBottomColor: c.borderLight,
  borderRightColor: c.borderLight,
};

/** Sunken content well (inputs, lists, progress tracks). */
export const wellStyle: ViewStyle = {
  backgroundColor: c.well,
  borderWidth: 2,
  borderTopColor: c.borderDark,
  borderLeftColor: c.borderDark,
  borderBottomColor: c.borderLight,
  borderRightColor: c.borderLight,
};

export const label: TextStyle = {
  color: c.text,
  fontSize: 12,
  fontWeight: '700',
  letterSpacing: 2,
  textTransform: 'uppercase',
};

export const body: TextStyle = {
  color: c.text,
  fontSize: 14,
};

export const dim: TextStyle = {
  color: c.textDim,
  fontSize: 12,
};

export const data: TextStyle = {
  color: c.text,
  fontSize: 14,
  fontFamily: mono,
};

export const sp = { xs: 4, s: 8, m: 12, l: 16, xl: 24 } as const;
