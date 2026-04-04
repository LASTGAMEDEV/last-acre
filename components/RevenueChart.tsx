import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Svg, Polyline, Polygon, Line, Text as SvgText, Rect } from 'react-native-svg';

export interface RevenueChartDataPoint {
  day: number;
  revenue: number;
}

interface Props {
  data: RevenueChartDataPoint[];  // sorted by day, length ≤ 30
  height?: number;                 // default 90
}

const PAD_L = 44;  // left padding for y-axis labels
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 18; // bottom padding for x-axis labels

export default function RevenueChart({ data, height = 90 }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const W = screenWidth - 24 - 24; // card horizontal padding
  const H = height;

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  const n = data.length;

  // Map data to SVG coordinates
  function toX(i: number): number {
    return PAD_L + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
  }
  function toY(revenue: number): number {
    return PAD_T + plotH - (revenue / maxRevenue) * plotH;
  }

  const points = data.map((d, i) => `${toX(i)},${toY(d.revenue)}`).join(' ');

  // Polygon fill: close the path along the bottom
  const fillPoints = n > 0
    ? `${toX(0)},${PAD_T + plotH} ${points} ${toX(n - 1)},${PAD_T + plotH}`
    : '';

  // Y-axis guide lines at 50% and 100%
  const guides = [1.0, 0.5].map(pct => ({
    y: PAD_T + plotH - pct * plotH,
    label: pct === 1.0
      ? maxRevenue >= 1000
        ? `$${Math.round(maxRevenue / 1000)}k`
        : `$${Math.round(maxRevenue)}`
      : maxRevenue >= 1000
        ? `$${Math.round(maxRevenue / 2000)}k`
        : `$${Math.round(maxRevenue / 2)}`,
  }));

  const isEmpty = data.every(d => d.revenue === 0);

  return (
    <View style={styles.wrap}>
      <Svg width={W} height={H}>
        {/* Background */}
        <Rect x={PAD_L} y={PAD_T} width={plotW} height={plotH} fill="#0a1628" rx={3} />

        {/* Guide lines */}
        {guides.map((g, i) => (
          <React.Fragment key={i}>
            <Line
              x1={PAD_L} y1={g.y} x2={PAD_L + plotW} y2={g.y}
              stroke="#1e2a3a" strokeWidth={1} strokeDasharray="4,4"
            />
            <SvgText
              x={PAD_L - 4} y={g.y + 4}
              fontSize={9} fill="#4a5a6a" textAnchor="end"
            >
              {g.label}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Zero line */}
        <Line
          x1={PAD_L} y1={PAD_T + plotH} x2={PAD_L + plotW} y2={PAD_T + plotH}
          stroke="#1e2a3a" strokeWidth={1}
        />

        {/* Fill area */}
        {!isEmpty && n > 1 && (
          <Polygon points={fillPoints} fill="rgba(76,175,80,0.12)" />
        )}

        {/* Line */}
        {!isEmpty && n > 1 && (
          <Polyline points={points} fill="none" stroke="#4caf50" strokeWidth={1.5} strokeLinejoin="round" />
        )}

        {/* X-axis: first and last day */}
        {n > 0 && (
          <>
            <SvgText x={toX(0)} y={H - 4} fontSize={9} fill="#4a5a6a" textAnchor="middle">
              d{data[0].day}
            </SvgText>
            {n > 1 && (
              <SvgText x={toX(n - 1)} y={H - 4} fontSize={9} fill="#4a5a6a" textAnchor="middle">
                d{data[n - 1].day}
              </SvgText>
            )}
          </>
        )}

        {/* Empty state */}
        {isEmpty && (
          <SvgText x={PAD_L + plotW / 2} y={PAD_T + plotH / 2 + 4} fontSize={11} fill="#3a4a5a" textAnchor="middle">
            No sales yet
          </SvgText>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start' },
});
