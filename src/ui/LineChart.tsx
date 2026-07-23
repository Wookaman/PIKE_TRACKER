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
  /** Y-axis (row) variable name, e.g. "WEIGHT (KG)". */
  yLabel?: string;
  /** X-axis (column) variable name, e.g. "DATE". */
  xLabel?: string;
}

const PAD_L = 48;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 34;

function niceRange(min: number, max: number): [number, number] {
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.1);
    return [min - pad, max + pad];
  }
  const pad = (max - min) * 0.1;
  return [min - pad, max + pad];
}

/** Hand-built monochrome SVG line chart over the XP-dark well. */
export function LineChart({ points, height = 190, yLabel, xLabel }: LineChartProps) {
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

  const yTitleX = 10;
  const yTitleY = PAD_T + plotH / 2;
  const dateY = PAD_T + plotH + 12;

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

        {/* First and last x tick labels (dates), kept sparse to avoid clutter. */}
        <SvgText x={PAD_L} y={dateY} fill={c.textDim} fontSize={8} fontFamily={mono} textAnchor="start">
          {points[0].label}
        </SvgText>
        {points.length > 1 ? (
          <SvgText
            x={width - PAD_R}
            y={dateY}
            fill={c.textDim}
            fontSize={8}
            fontFamily={mono}
            textAnchor="end"
          >
            {points[points.length - 1].label}
          </SvgText>
        ) : null}

        {/* Axis variable names. */}
        {yLabel ? (
          <SvgText
            x={yTitleX}
            y={yTitleY}
            fill={c.text}
            fontSize={9}
            fontFamily={mono}
            textAnchor="middle"
            transform={`rotate(-90, ${yTitleX}, ${yTitleY})`}
          >
            {yLabel}
          </SvgText>
        ) : null}
        {xLabel ? (
          <SvgText
            x={PAD_L + plotW / 2}
            y={height - 4}
            fill={c.text}
            fontSize={9}
            fontFamily={mono}
            textAnchor="middle"
          >
            {xLabel}
          </SvgText>
        ) : null}
      </Svg>
    </SunkenPanel>
  );
}
