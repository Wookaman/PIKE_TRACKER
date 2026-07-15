import { ReactNode } from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { BevelButton } from './BevelButton';
import { bevelUp, c, label, sp } from './theme';

interface WindowProps {
  title: string;
  /** Right slot in the title bar: status text or controls. */
  right?: ReactNode;
  /** Renders a working ✕ button in the title bar. */
  onClose?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Retro OS window: raised chrome, title bar, content area. */
export function Window({ title, right, onClose, children, style }: WindowProps) {
  return (
    <View style={[bevelUp, style]}>
      <View
        style={{
          backgroundColor: c.raisedHi,
          borderBottomWidth: 1,
          borderBottomColor: c.borderDark,
          paddingHorizontal: sp.m,
          paddingVertical: sp.s,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={label} numberOfLines={1}>
          {title}
        </Text>
        {onClose ? (
          <BevelButton small onPress={onClose} style={{ paddingVertical: 2, paddingHorizontal: 8 }}>
            <Text style={[label, { fontSize: 11 }]}>✕</Text>
          </BevelButton>
        ) : (
          right ?? null
        )}
      </View>
      <View style={{ padding: sp.m }}>{children}</View>
    </View>
  );
}
