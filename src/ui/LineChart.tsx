import { Text } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { SunkenPanel } from './SunkenPanel';
import { c, dim, mono } from './theme';

export interface ChartPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  points: ChartPoint[];
  height?: number;
  unit?: string;
}

const PAD_L = 40;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 22;

function niceRange(min: number, max: number): [number, number] {
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.1);
    return [min - pad, max + pad];
  }
  const pad = (max - min) * 0.1;
  return [min - pad, max + pad];
}

/** Hand-built monochrome SVG line chart over the XP-dark well. */
export function LineChart({ points, height = 180, unit }: LineChartProps) {
  if (points.length === 0) {
    return (
      <SunkenPanel style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={dim}>NO DATA YET</Text>
      </SunkenPanel>
    );
  }

  const width = 320; // viewBox units; SVG scales to container width
  const values = points.map((p) => p.value);
  const [lo, hi] = niceRange(Math.min(...values), Math.max(...values));
  const span = hi - lo || 1;

  const plotW = width - PAD_L - PAD_R;
  const plotH = height - PAD_T - PAD_B;
  const x = (i: number) =>
    PAD_L + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD_T + plotH - ((v - lo) / span) * plotH;

  const polyPoints = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');

  // Three y gridlines/labels: bottom, mid, top.
  const yTicks = [lo, lo + span / 2, hi];

  return (
    <SunkenPanel style={{ padding: 4 }}>
      <Svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        {yTicks.map((v, i) => (
          <Line
            key={`g${i}`}
            x1={PAD_L}
            y1={y(v)}
            x2={width - PAD_R}
            y2={y(v)}
            stroke={c.borderLight}
            strokeWidth={0.5}
          />
        ))}
        {yTicks.map((v, i) => (
          <SvgText
            key={`t${i}`}
            x={PAD_L - 4}
            y={y(v) + 3}
            fill={c.textDim}
            fontSize={8}
            fontFamily={mono}
            textAnchor="end"
          >
            {Math.round(v)}
          </SvgText>
        ))}

        <Polyline points={polyPoints} fill="none" stroke={c.white} strokeWidth={1.5} />
        {points.map((p, i) => (
          <Circle key={`p${i}`} cx={x(i)} cy={y(p.value)} r={2} fill={c.white} />
        ))}

        {/* First and last x labels (dates), kept sparse to avoid clutter. */}
        <SvgText x={PAD_L} y={height - 6} fill={c.textDim} fontSize={8} fontFamily={mono} textAnchor="start">
          {points[0].label}
        </SvgText>
        {points.length > 1 ? (
          <SvgText
            x={width - PAD_R}
            y={height - 6}
            fill={c.textDim}
            fontSize={8}
            fontFamily={mono}
            textAnchor="end"
          >
            {points[points.length - 1].label}
          </SvgText>
        ) : null}
        {unit ? (
          <SvgText x={PAD_L} y={PAD_T - 3} fill={c.textFaint} fontSize={8} fontFamily={mono} textAnchor="start">
            {unit}
          </SvgText>
        ) : null}
      </Svg>
    </SunkenPanel>
  );
}
