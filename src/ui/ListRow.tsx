import { ReactNode, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as haptics from './haptics';
import { body, c, dim, sp } from './theme';

interface ListRowProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
}

/** Row inside a SunkenPanel list. Pressed = inverted strip. */
export function ListRow({ title, subtitle, right, onPress, onLongPress }: ListRowProps) {
  const [pressed, setPressed] = useState(false);
  const interactive = Boolean(onPress || onLongPress);

  return (
    <Pressable
      onPressIn={() => {
        if (!interactive) return;
        setPressed(true);
        haptics.tap();
      }}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: sp.m,
        paddingVertical: sp.s + 2,
        backgroundColor: pressed ? c.raisedHi : 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: c.surface,
        gap: sp.s,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={[body, pressed && { color: c.white }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[dim, { marginTop: 2 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? null}
    </Pressable>
  );
}
