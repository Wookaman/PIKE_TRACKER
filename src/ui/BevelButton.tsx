import { ReactNode, useState } from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import * as haptics from './haptics';
import { bevelDown, bevelUp, c, label } from './theme';

interface BevelButtonProps {
  title?: string;
  children?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  small?: boolean;
  /** Stays visually sunken (toggle/active state). */
  active?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The core tactile control: raised bevel that physically inverts while
 * pressed, content nudges 1px down-right, light haptic on touch.
 */
export function BevelButton({
  title,
  children,
  onPress,
  onLongPress,
  small,
  active,
  disabled,
  style,
}: BevelButtonProps) {
  const [pressed, setPressed] = useState(false);
  const down = pressed || active;

  return (
    <Pressable
      onPressIn={() => {
        if (disabled) return;
        setPressed(true);
        haptics.tap();
      }}
      onPressOut={() => setPressed(false)}
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      style={[
        down ? bevelDown : bevelUp,
        {
          paddingVertical: small ? 6 : 10,
          paddingHorizontal: small ? 10 : 14,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <View
        style={{
          transform: [{ translateX: down ? 1 : 0 }, { translateY: down ? 1 : 0 }],
          alignItems: 'center',
        }}
      >
        {title !== undefined ? (
          <Text style={[label, { fontSize: small ? 11 : 12, color: down ? c.white : c.text }]}>
            {title}
          </Text>
        ) : (
          children
        )}
      </View>
    </Pressable>
  );
}
