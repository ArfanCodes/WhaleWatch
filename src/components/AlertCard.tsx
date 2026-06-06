import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, formatUsd, tierLabel, timeAgo } from '../types';
import { colors, font, radius, space, type, moodColor } from '../theme';
import { motionEnabled } from '../motion';

interface Props {
  alert: Alert;
  index?: number;
  onPress?: (a: Alert) => void;
}

const dirColor: Record<Alert['direction'], string> = {
  sold: colors.fearful,
  bought: colors.greedy,
  moved: colors.neon,
};

const dirArrow: Record<Alert['direction'], string> = {
  sold: '▼',
  bought: '▲',
  moved: '◆',
};

const FRESH_MS = 4 * 60 * 1000; // "fresh" = within 4 minutes
const useNative = Platform.OS !== 'web';

export default function AlertCard({ alert, index = 0, onPress }: Props) {
  const tint = moodColor(alert.moodScore);
  const dir = dirColor[alert.direction];
  const isMoved = alert.direction === 'moved';

  const ageMs = Date.now() - new Date(alert.createdAt).getTime();
  const fresh = ageMs < FRESH_MS;
  const intensity = Math.max(0, Math.min(1, (alert.usdValue - 1_000_000) / 11_000_000));

  const enter = useRef(new Animated.Value(0)).current;
  const arrival = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!motionEnabled()) {
      enter.setValue(1);
      if (fresh) pulse.setValue(1);
      return;
    }
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      delay: index * 70,
      useNativeDriver: useNative,
    }).start();

    if (fresh) {
      Animated.sequence([
        Animated.delay(index * 70),
        Animated.timing(arrival, { toValue: 1, duration: 280, useNativeDriver: useNative }),
        Animated.timing(arrival, { toValue: 0, duration: 900, useNativeDriver: useNative }),
      ]).start();

      const duration = 2100 - intensity * 800;
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration, useNativeDriver: useNative }),
          Animated.timing(pulse, { toValue: 0, duration, useNativeDriver: useNative }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [enter, arrival, pulse, fresh, intensity, index]);

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] });
  // fresh cards: the whole card breathes with a soft directional glow
  const glowOpacity = fresh
    ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.4 + intensity * 0.35] })
    : 0;

  const fillW = Math.max(3, (26 * alert.moodScore) / 100);
  const borderTint = isMoved ? colors.border : dir + '33';

  return (
    <Animated.View style={{ opacity: enter, transform: [{ translateY }] }}>
      <Pressable
        onPress={() => onPress?.(alert)}
        style={({ pressed }) => [styles.card, { borderColor: borderTint }, pressed && styles.pressed]}
      >
        {/* mood/direction tinted gradient background */}
        <LinearGradient
          colors={[dir + (isMoved ? '0D' : '22'), dir + '00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          locations={[0, 0.7]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* breathing glow border for fresh alerts (replaces the old left bar) */}
        <Animated.View
          pointerEvents="none"
          style={[styles.glowBorder, { borderColor: dir, opacity: glowOpacity }]}
        />
        {/* one-time arrival flash */}
        <Animated.View
          pointerEvents="none"
          style={[styles.glowBorder, { borderColor: dir, opacity: arrival }]}
        />

        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={styles.idRow}>
              <View style={styles.symbolChip}>
                <Text style={styles.symbolText}>{alert.symbol}</Text>
              </View>
              <View style={[styles.dirTag, { backgroundColor: dir + '1F' }]}>
                <Text style={[styles.dirArrow, { color: dir }]}>{dirArrow[alert.direction]}</Text>
                <Text style={[styles.dirText, { color: dir }]}>{alert.direction.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.rightTop}>
              {fresh ? (
                <View style={[styles.freshTag, { borderColor: dir + '66', backgroundColor: dir + '14' }]}>
                  <View style={[styles.freshDot, { backgroundColor: dir }]} />
                  <Text style={[styles.freshText, { color: dir }]}>NEW</Text>
                </View>
              ) : null}
              <Text style={styles.time}>{timeAgo(alert.createdAt)}</Text>
            </View>
          </View>

          {/* hero amount */}
          <Text
            style={[
              styles.amount,
              fresh && { textShadowColor: dir + 'AA', textShadowRadius: 16 },
            ]}
          >
            {formatUsd(alert.usdValue)}
          </Text>
          <Text style={styles.sub}>{alert.coin} · whale {alert.direction}</Text>

          <View style={styles.footer}>
            <View style={[styles.moodPill, { borderColor: tint + '55', backgroundColor: tint + '14' }]}>
              <View
                style={[
                  styles.moodDot,
                  {
                    backgroundColor: tint,
                    shadowColor: tint,
                    shadowOpacity: 0.5 + (alert.moodScore / 100) * 0.5,
                    shadowRadius: 2 + (alert.moodScore / 100) * 6,
                  },
                ]}
              />
              <Text style={[styles.moodLabel, { color: tint }]}>{alert.moodLabel.toUpperCase()}</Text>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: fillW, backgroundColor: tint }]} />
              </View>
              <Text style={[styles.moodScore, { color: tint }]}>{Math.round(alert.moodScore)}</Text>
            </View>

            <View style={styles.tier}>
              <Text style={styles.tierLabel}>WHALE</Text>
              <Text style={styles.tierValue}>{tierLabel(alert.tier)}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginHorizontal: space.lg,
    marginVertical: space.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },
  glowBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  body: { paddingHorizontal: space.xl, paddingVertical: space.lg },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  idRow: { flexDirection: 'row', alignItems: 'center' },
  rightTop: { flexDirection: 'row', alignItems: 'center' },
  symbolChip: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  symbolText: { color: colors.text, fontSize: font.xs, fontFamily: type.bold, letterSpacing: 0.5 },
  dirTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: space.sm,
    borderRadius: radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  dirArrow: { fontSize: 10, marginRight: 4, fontFamily: type.bold },
  dirText: { fontSize: 11, fontFamily: type.bold, letterSpacing: 1.2 },
  freshTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: space.sm,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  freshDot: { width: 5, height: 5, borderRadius: 3, marginRight: 4 },
  freshText: { fontSize: 9, fontFamily: type.extrabold, letterSpacing: 1 },
  time: { color: colors.textFaint, fontSize: 11, fontFamily: type.medium },

  amount: {
    color: colors.text,
    fontSize: 36,
    fontFamily: type.extrabold,
    marginTop: space.lg,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  sub: { color: colors.textFaint, fontSize: 12, fontFamily: type.medium, marginTop: 2 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.lg,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 5,
  },
  moodDot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  moodLabel: { fontSize: 11, fontFamily: type.bold, letterSpacing: 1 },
  bar: {
    width: 26,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginLeft: 8,
    overflow: 'hidden',
  },
  barFill: { height: 4, borderRadius: 2 },
  moodScore: { fontSize: 11, fontFamily: type.extrabold, marginLeft: 7, fontVariant: ['tabular-nums'] },
  tier: { alignItems: 'flex-end' },
  tierLabel: { color: colors.textFaint, fontSize: 9, fontFamily: type.bold, letterSpacing: 1.5 },
  tierValue: { color: colors.textDim, fontSize: font.sm, fontFamily: type.bold, fontVariant: ['tabular-nums'] },
});
