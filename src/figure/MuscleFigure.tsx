import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { G, Polygon } from 'react-native-svg';
import { MuscleHighlights } from '../lib/muscles';
import { c } from '../ui/theme';
import { BACK, FigurePoly, FRONT } from './bodyPolygons';

function fillFor(poly: FigurePoly, highlights: MuscleHighlights): string {
  if (poly.muscle === 'silhouette') return c.raised;
  const state = highlights[poly.muscle];
  if (state === 'primary') return c.white;
  if (state === 'secondary') return c.muscleSecondary;
  return c.muscleIdle;
}

function Body({ polys, highlights }: { polys: FigurePoly[]; highlights: MuscleHighlights }) {
  return (
    <>
      {polys.map((poly, i) => (
        <Polygon
          key={i}
          points={poly.points}
          fill={fillFor(poly, highlights)}
          stroke={poly.muscle === 'silhouette' ? c.borderLight : c.bg}
          strokeWidth={poly.muscle === 'silhouette' ? 0.8 : 0.6}
        />
      ))}
    </>
  );
}

/** Front + back low-poly bodies; worked muscles light up. */
export function MuscleFigure({ highlights }: { highlights: MuscleHighlights }) {
  const opacity = useRef(new Animated.Value(0.35)).current;
  const signature = Object.entries(highlights)
    .map(([k, v]) => `${k}:${v}`)
    .sort()
    .join('|');

  useEffect(() => {
    opacity.setValue(0.35);
    Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [signature, opacity]);

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={{ opacity, width: '100%', maxWidth: 340 }}>
        <Svg viewBox="0 0 210 220" width="100%" height={240}>
          <G>
            <Body polys={FRONT} highlights={highlights} />
          </G>
          <G x={110}>
            <Body polys={BACK} highlights={highlights} />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}
