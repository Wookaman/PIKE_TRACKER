import { View } from 'react-native';
import { c, wellStyle } from './theme';

interface XPProgressProps {
  value: number;
  max: number;
  segments?: number;
}

/**
 * Segmented block progress bar, XP-copy style. Filled blocks are white;
 * blocks past the goal render dim so overshoot is visible but quiet.
 */
export function XPProgress({ value, max, segments = 20 }: XPProgressProps) {
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.max(0, value / safeMax);
  const filled = Math.min(segments, Math.round(ratio * segments));
  const over = ratio > 1;

  return (
    <View style={[wellStyle, { flexDirection: 'row', padding: 3, gap: 2, height: 18 }]}>
      {Array.from({ length: segments }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: i < filled ? (over ? c.textDim : c.white) : 'transparent',
          }}
        />
      ))}
    </View>
  );
}
