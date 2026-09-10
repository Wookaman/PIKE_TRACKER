import { ReactNode, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as haptics from './haptics';
import { bevelDown, bevelUp, c, label } from './theme';

const DEL_WIDTH = 76;

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: ReactNode;
  /** Disables the gesture — e.g. the last remaining set, which must stay. */
  disabled?: boolean;
  /**
   * Background that slides over the DEL button. Must be opaque or the button
   * shows through while the row is closed. Defaults to the well these rows
   * sit in.
   */
  background?: string;
}

function DelButton({ onPress }: { onPress: () => void }) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      // Fills the row's measured height: the actions container is stretched to
      // it, so the button is always exactly as tall as the row it deletes.
      style={[
        pressed ? bevelDown : bevelUp,
        {
          width: DEL_WIDTH,
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? c.surface : c.raisedHi,
        },
      ]}
    >
      <View
        style={{
          transform: [{ translateX: pressed ? 1 : 0 }, { translateY: pressed ? 1 : 0 }],
        }}
      >
        <Text style={[label, { color: pressed ? c.white : c.text }]}>DEL</Text>
      </View>
    </Pressable>
  );
}

/** Swipe a row left to reveal a full-height DEL button. Tapping it deletes. */
export function SwipeToDelete({
  onDelete,
  children,
  disabled,
  background = c.well,
}: SwipeToDeleteProps) {
  const ref = useRef<SwipeableMethods>(null);

  if (disabled) return <>{children}</>;

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={1.6}
      rightThreshold={DEL_WIDTH * 0.4}
      overshootRight={false}
      childrenContainerStyle={{ backgroundColor: background }}
      // Web/trackpad: without this the gesture needs click-and-drag anyway,
      // but enabling it makes two-finger swipes work on laptops.
      enableTrackpadTwoFingerGesture
      onSwipeableOpen={() => haptics.tap()}
      renderRightActions={() => (
        <DelButton
          onPress={() => {
            haptics.thud();
            ref.current?.close();
            onDelete();
          }}
        />
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
