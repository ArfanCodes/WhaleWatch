import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  ActivityIndicator,
  LayoutChangeEvent,
  Dimensions,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { LinearGradient as LinearGradientView } from 'expo-linear-gradient';
import { colors, font, radius, space, type } from '../theme';
import { Alert, formatUsd, timeAgo } from '../types';
import { PricePoint, priceAt } from '../lib/prices';
import { motionEnabled } from '../motion';

type Range = '1H' | '24H';

interface Props {
  points: PricePoint[];
  alerts: Alert[];
  loading: boolean;
  error?: string | null;
}

const PLOT_H = 150;
const useNative = Platform.OS !== 'web';

type XY = { x: number; y: number };

// Catmull-Rom -> cubic bezier for a smooth (not jagged) price line.
function smoothPath(pts: XY[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

// A single pulsing, tappable whale beacon on the line.
function WhaleBeacon({
  x,
  y,
  color,
  delay,
  onPress,
}: {
  x: number;
  y: number;
  color: string;
  delay: number;
  onPress: () => void;
}) {
  const appear = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!motionEnabled()) {
      appear.setValue(1);
      return;
    }
    Animated.timing(appear, {
      toValue: 1,
      duration: 380,
      delay,
      useNativeDriver: useNative,
    }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: useNative }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, useNativeDriver: useNative }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [appear, pulse, delay]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={[styles.beacon, { left: x - 16, top: y - 16 }]}
    >
      <Animated.View
        style={[
          styles.ring,
          { borderColor: color, opacity: Animated.multiply(appear, ringOpacity), transform: [{ scale: ringScale }] },
        ]}
      />
      <Animated.View style={[styles.beaconGlow, { backgroundColor: color, opacity: appear }]} />
      <Animated.View
        style={[
          styles.beaconDot,
          { backgroundColor: color, opacity: appear, transform: [{ scale: appear }] },
        ]}
      />
    </Pressable>
  );
}

export default function PriceChart({ points, alerts, loading, error }: Props) {
  const [range, setRange] = useState<Range>('24H');
  // Fallback to screen-derived width so the chart renders before onLayout fires.
  const [width, setWidth] = useState(Dimensions.get('window').width - space.lg * 2 - 2);
  const [selected, setSelected] = useState<Alert | null>(null);

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!motionEnabled()) {
      fade.setValue(1);
      return;
    }
    if (points.length) {
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: useNative }).start();
    }
  }, [points.length, fade]);

  const now = Date.now();
  const windowMs = range === '1H' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const view = useMemo(() => {
    const cutoff = now - windowMs;
    const filtered = points.filter((p) => p.t >= cutoff);
    const pts = filtered.length >= 2 ? filtered : points;
    const cur = pts.length ? pts[pts.length - 1].price : 0;
    const first = pts.length ? pts[0].price : 0;
    const changePct = first ? ((cur - first) / first) * 100 : 0;
    const prices = pts.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { pts, cur, changePct, min, max };
  }, [points, range, windowMs, now]);

  const up = view.changePct >= 0;
  const lineColor = up ? colors.greedy : colors.fearful;

  // Scales — we own them, so markers land exactly on the line.
  const tMin = view.pts.length ? view.pts[0].t : 0;
  const tMax = view.pts.length ? view.pts[view.pts.length - 1].t : 1;
  const pad = (view.max - view.min) * 0.18 || 1;
  const pMin = view.min - pad;
  const pMax = view.max + pad;
  const xScale = (t: number) => ((t - tMin) / (tMax - tMin || 1)) * width;
  const yScale = (p: number) => PLOT_H - 6 - ((p - pMin) / (pMax - pMin || 1)) * (PLOT_H - 12);

  const linePts: XY[] = useMemo(
    () => (width > 0 ? view.pts.map((p) => ({ x: xScale(p.t), y: yScale(p.price) })) : []),
    [view.pts, width, pMin, pMax, tMin, tMax],
  );
  const linePath = useMemo(() => smoothPath(linePts), [linePts]);
  const areaPath = useMemo(() => {
    if (!linePts.length) return '';
    const first = linePts[0];
    const last = linePts[linePts.length - 1];
    return `${smoothPath(linePts)} L ${last.x} ${PLOT_H} L ${first.x} ${PLOT_H} Z`;
  }, [linePts]);

  const markers = useMemo(() => {
    if (!width) return [] as { a: Alert; x: number; y: number; color: string }[];
    return alerts
      .filter((a) => {
        const t = new Date(a.createdAt).getTime();
        return t >= tMin && t <= tMax;
      })
      .map((a) => {
        const t = new Date(a.createdAt).getTime();
        const price = priceAt(view.pts, t) ?? view.cur;
        const color =
          a.direction === 'sold' ? colors.fearful : a.direction === 'bought' ? colors.greedy : colors.neon;
        return { a, x: xScale(t), y: yScale(price), color };
      });
  }, [alerts, view.pts, width, tMin, tMax, pMin, pMax]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <Animated.View style={[styles.card, { opacity: points.length ? fade : 1 }]}>
      {/* subtle gradient background */}
      <LinearGradientView
        colors={[colors.surfaceAlt, colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pair}>ETH / USD</Text>
          <Text style={styles.price}>
            {view.cur
              ? `$${view.cur.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '—'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={[styles.pill, { backgroundColor: lineColor + '22' }]}>
            <Text style={[styles.pillText, { color: lineColor }]}>
              {up ? '▲' : '▼'} {Math.abs(view.changePct).toFixed(2)}%
            </Text>
          </View>
          <View style={styles.toggle}>
            {(['1H', '24H'] as Range[]).map((r) => (
              <Pressable
                key={r}
                onPress={() => setRange(r)}
                style={[styles.toggleBtn, range === r && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, range === r && styles.toggleTextActive]}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* plot */}
      <View style={styles.plot} onLayout={onLayout}>
        {loading && !view.pts.length ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.neon} />
            <Text style={styles.dim}>Loading ETH price…</Text>
          </View>
        ) : view.pts.length && width > 0 ? (
          <>
            <Svg width={width} height={PLOT_H}>
              <Defs>
                <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={lineColor} stopOpacity={0.34} />
                  <Stop offset="0.7" stopColor={lineColor} stopOpacity={0.06} />
                  <Stop offset="1" stopColor={lineColor} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              {/* gradient fill */}
              <Path d={areaPath} fill="url(#fill)" />
              {/* soft glow: stacked translucent strokes */}
              <Path d={linePath} stroke={lineColor} strokeWidth={9} strokeOpacity={0.1} fill="none" strokeLinecap="round" />
              <Path d={linePath} stroke={lineColor} strokeWidth={5} strokeOpacity={0.18} fill="none" strokeLinecap="round" />
              {/* crisp line */}
              <Path d={linePath} stroke={lineColor} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>

            {/* whale beacons */}
            {markers.map((m, i) => (
              <WhaleBeacon
                key={m.a.id}
                x={m.x}
                y={m.y}
                color={m.color}
                delay={300 + i * 90}
                onPress={() => setSelected((s) => (s?.id === m.a.id ? null : m.a))}
              />
            ))}
          </>
        ) : (
          <View style={styles.center}>
            <Text style={styles.dim}>{error ? 'Price feed unavailable' : 'No data'}</Text>
          </View>
        )}
      </View>

      {/* detail popover / legend */}
      {selected ? (
        <Pressable style={styles.detail} onPress={() => setSelected(null)}>
          <Text style={styles.detailHead}>
            {formatUsd(selected.usdValue)}{' '}
            <Text style={{ color: selected.direction === 'sold' ? colors.fearful : colors.greedy }}>
              {selected.direction.toUpperCase()}
            </Text>
          </Text>
          <Text style={styles.detailSub}>
            Crowd {selected.moodLabel} · {timeAgo(selected.createdAt)} · tap to close
          </Text>
        </Pressable>
      ) : (
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: colors.fearful }]} />
          <Text style={styles.legendText}>sold</Text>
          <View style={[styles.legendDot, { backgroundColor: colors.greedy, marginLeft: space.md }]} />
          <Text style={styles.legendText}>bought</Text>
          <Text style={styles.legendHint}>· tap a beacon</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: space.lg,
    marginTop: space.sm,
    paddingTop: space.lg,
    paddingBottom: space.md,
    overflow: 'hidden',
    shadowColor: colors.neon,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: space.lg,
    marginBottom: space.sm,
  },
  pair: { color: colors.textDim, fontSize: font.xs, fontFamily: type.bold, letterSpacing: 1.5 },
  price: {
    color: colors.text,
    fontSize: 28,
    fontFamily: type.extrabold,
    marginTop: 2,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  pill: { borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 4 },
  pillText: { fontSize: font.sm, fontFamily: type.bold, fontVariant: ['tabular-nums'] },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 3,
    marginTop: space.sm,
  },
  toggleBtn: { paddingHorizontal: space.md, paddingVertical: 3, borderRadius: radius.pill },
  toggleBtnActive: { backgroundColor: colors.neon },
  toggleText: { color: colors.textDim, fontSize: font.xs, fontFamily: type.bold },
  toggleTextActive: { color: colors.bg, fontFamily: type.extrabold },
  plot: { height: PLOT_H, width: '100%', marginTop: space.xs },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dim: { color: colors.textFaint, fontSize: font.xs, fontFamily: type.medium, marginTop: 6 },

  beacon: { position: 'absolute', width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  beaconGlow: { position: 'absolute', width: 20, height: 20, borderRadius: 10, opacity: 0.25 },
  beaconDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: colors.bg },

  detail: {
    marginTop: space.sm,
    marginHorizontal: space.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  detailHead: { color: colors.text, fontSize: font.md, fontFamily: type.extrabold },
  detailSub: { color: colors.textDim, fontSize: font.xs, fontFamily: type.medium, marginTop: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, marginTop: space.sm },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  legendText: { color: colors.textDim, fontSize: font.xs, fontFamily: type.medium },
  legendHint: { color: colors.textFaint, fontSize: font.xs, fontFamily: type.regular, marginLeft: 6 },
});
