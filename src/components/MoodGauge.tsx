import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, font, type, moodColor, moodLabel } from '../theme';

interface Props {
  score: number; // 0 (max fear) .. 100 (max greed)
  size?: number;
  caption?: string;
}

// Convert a 0..100 score to an angle on a half-dial.
// 0 -> 180deg (left), 100 -> 0deg (right).
function scoreToAngle(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  return 180 - (clamped / 100) * 180;
}

// Build an SVG arc path between two angles (degrees) on a circle.
function arc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = (startDeg * Math.PI) / 180;
  const e = (endDeg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(s);
  const y1 = cy - r * Math.sin(s);
  const x2 = cx + r * Math.cos(e);
  const y2 = cy - r * Math.sin(e);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg < startDeg ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} ${sweep} ${x2} ${y2}`;
}

export default function MoodGauge({ score, size = 220, caption }: Props) {
  const w = size;
  const h = size * 0.62;
  const cx = w / 2;
  const cy = h - 8;
  const r = w / 2 - 16;
  const angle = scoreToAngle(score);
  const needleLen = r - 6;
  const nx = cx + needleLen * Math.cos((angle * Math.PI) / 180);
  const ny = cy - needleLen * Math.sin((angle * Math.PI) / 180);
  const label = moodLabel(score);
  const tint = moodColor(score);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={w} height={h + 8}>
        <Defs>
          <LinearGradient id="moodArc" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.fearful} />
            <Stop offset="0.5" stopColor={colors.neutral} />
            <Stop offset="1" stopColor={colors.greedy} />
          </LinearGradient>
        </Defs>

        {/* track */}
        <Path
          d={arc(cx, cy, r, 180, 0)}
          stroke={colors.border}
          strokeWidth={14}
          strokeLinecap="round"
          fill="none"
        />
        {/* colored fear->greed arc */}
        <Path
          d={arc(cx, cy, r, 180, 0)}
          stroke="url(#moodArc)"
          strokeWidth={10}
          strokeLinecap="round"
          fill="none"
          opacity={0.9}
        />

        {/* needle */}
        <G>
          <Path
            d={`M ${cx} ${cy} L ${nx} ${ny}`}
            stroke={tint}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Circle cx={cx} cy={cy} r={9} fill={tint} />
          <Circle cx={cx} cy={cy} r={4} fill={colors.bg} />
        </G>
      </Svg>

      <View style={styles.readout}>
        <Text style={[styles.score, { color: tint }]}>{Math.round(score)}</Text>
        <Text style={[styles.label, { color: tint }]}>{label}</Text>
      </View>
      <View style={styles.ends}>
        <Text style={styles.endText}>Fearful</Text>
        <Text style={styles.endText}>Greedy</Text>
      </View>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { alignItems: 'center', marginTop: -6 },
  score: { fontSize: font.xxl, fontFamily: type.black, fontVariant: ['tabular-nums'] },
  label: { fontSize: font.md, fontFamily: type.bold, letterSpacing: 1 },
  ends: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '78%',
    marginTop: 4,
  },
  endText: { color: colors.textFaint, fontSize: font.xs, fontFamily: type.semibold },
  caption: { color: colors.textDim, fontSize: font.xs, fontFamily: type.regular, marginTop: 8 },
});
