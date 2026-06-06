import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Text, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import AlertCard from '../components/AlertCard';
import MoodGauge from '../components/MoodGauge';
import PriceChart from '../components/PriceChart';
import { Alert } from '../types';
import { fetchEthSeries, PricePoint } from '../lib/prices';
import { colors, font, space, type } from '../theme';
import { motionEnabled } from '../motion';
import { useAlerts } from '../hooks/useAlerts';

const REFRESH_MS = 45_000; // CoinGecko free tier — refresh every 45s

export default function FeedScreen() {
  // Live alerts from Supabase (falls back to seed data if keys not set yet).
  const alerts = useAlerts();

  const [points, setPoints] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const series = await fetchEthSeries();
        if (!alive) return;
        setPoints(series.points);
        setError(null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? 'fetch failed');
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Overall ETH mood = average of recent alert moods (Phase 1 makes this live).
  const avgMood = useMemo(
    () => alerts.reduce((s, a) => s + a.moodScore, 0) / Math.max(1, alerts.length),
    [alerts],
  );

  const onPress = (a: Alert) => {
    // Phase 5+: deep-link to chart marker.
  };

  // LIVE FEED header dot — pulses to tie the feed together.
  const livePulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!motionEnabled()) {
      livePulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 1, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(livePulse, { toValue: 0, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [livePulse]);
  const liveDotOpacity = livePulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const liveDotScale = livePulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={alerts}
        keyExtractor={(a) => a.id}
        renderItem={({ item, index }) => (
          <AlertCard alert={item} index={index} onPress={onPress} />
        )}
        ListHeaderComponent={
          <View>
            <ScreenHeader title="WhaleWatch" subtitle="Live whale moves + crowd mood, fused" />

            {/* Live ETH price chart with whale markers (top of screen) */}
            <PriceChart points={points} alerts={alerts} loading={loading} error={error} />

            {/* Slim mood gauge */}
            <View style={styles.gaugeCard}>
              <Text style={styles.gaugeTitle}>Ethereum mood right now</Text>
              <MoodGauge score={avgMood} size={168} />
            </View>

            <View style={styles.liveRow}>
              <Animated.View
                style={[
                  styles.liveDot,
                  { opacity: liveDotOpacity, transform: [{ scale: liveDotScale }] },
                ]}
              />
              <Text style={styles.liveText}>LIVE FEED</Text>
            </View>
          </View>
        }
        contentContainerStyle={{ paddingBottom: space.xxl }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  gaugeCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: space.lg,
    marginTop: space.md,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  gaugeTitle: {
    color: colors.textDim,
    fontSize: font.xs,
    fontFamily: type.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: space.xs,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    marginTop: space.lg,
    marginBottom: space.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neonPink,
    marginRight: space.sm,
  },
  liveText: { color: colors.textDim, fontSize: font.xs, fontFamily: type.extrabold, letterSpacing: 1.5 },
});
