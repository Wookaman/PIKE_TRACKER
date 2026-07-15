import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { wellStyle } from './theme';

interface SunkenPanelProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Inset content well. */
export function SunkenPanel({ children, style }: SunkenPanelProps) {
  return <View style={[wellStyle, style]}>{children}</View>;
}
