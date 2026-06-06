import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { colors, font, radius, space, type } from '../theme';

// Phase 4 wires this to per-user watchlists in Supabase.
// For now ETH is the live coin; others preview the upcoming multi-coin support.
const COINS = [
  { symbol: 'ETH', name: 'Ethereum', live: true },
  { symbol: 'BTC', name: 'Bitcoin', live: false },
  { symbol: 'SOL', name: 'Solana', live: false },
  { symbol: 'USDT', name: 'Tether', live: false },
];

export default function WatchlistScreen() {
  const [watched, setWatched] = useState<Record<string, boolean>>({ ETH: true });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Watchlist" subtitle="Only get alerted for the coins you pick" />
        {COINS.map((c) => (
          <View key={c.symbol} style={styles.row}>
            <View style={styles.left}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>{c.symbol[0]}</Text>
              </View>
              <View>
                <Text style={styles.name}>{c.name}</Text>
                <Text style={styles.sym}>
                  {c.symbol}
                  {c.live ? '  · live' : '  · coming soon'}
                </Text>
              </View>
            </View>
            <Switch
              value={!!watched[c.symbol]}
              disabled={!c.live}
              onValueChange={(v) => setWatched((w) => ({ ...w, [c.symbol]: v }))}
              trackColor={{ true: colors.neon, false: colors.border }}
              thumbColor={colors.text}
            />
          </View>
        ))}
        <Text style={styles.note}>
          More coins unlock as we add their data feeds. Ethereum is fully live in this build.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginHorizontal: space.lg,
    marginVertical: space.sm,
    padding: space.lg,
  },
  left: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconText: { color: colors.neon, fontSize: font.md, fontFamily: type.extrabold },
  name: { color: colors.text, fontSize: font.md, fontFamily: type.bold },
  sym: { color: colors.textFaint, fontSize: font.xs, fontFamily: type.medium, marginTop: 2 },
  note: {
    color: colors.textFaint,
    fontSize: font.xs,
    fontFamily: type.regular,
    paddingHorizontal: space.lg,
    marginTop: space.md,
    lineHeight: 18,
  },
});
