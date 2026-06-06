import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { colors, font, radius, space, type } from '../theme';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Settings" subtitle="How WhaleWatch is tuned" />

        <Text style={styles.section}>Alert rules</Text>
        <View style={styles.card}>
          <Row label="Tracked coin" value="Ethereum" />
          <Row label="Whale threshold" value="$1M and up" />
          <Row label="Tier 1" value="$1M+" />
          <Row label="Tier 2" value="$5M+" />
          <Row label="Tier 3" value="$10M+" />
          <Row label="Push limit" value="No cap (every move)" />
        </View>

        <Text style={styles.section}>About</Text>
        <View style={styles.card}>
          <Row label="Version" value="0.1.0 · Phase 0" />
          <Row label="Mode" value="Dark" />
        </View>

        <Text style={styles.note}>
          This build shows demo seed data so the design is visible. Live Ethereum
          whale alerts switch on in Phase 1.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  section: {
    color: colors.textDim,
    fontSize: font.xs,
    fontFamily: type.extrabold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginHorizontal: space.lg,
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginHorizontal: space.lg,
    paddingHorizontal: space.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  label: { color: colors.textDim, fontSize: font.sm, fontFamily: type.medium },
  value: { color: colors.text, fontSize: font.sm, fontFamily: type.bold },
  note: {
    color: colors.textFaint,
    fontSize: font.xs,
    fontFamily: type.regular,
    paddingHorizontal: space.lg,
    marginTop: space.lg,
    lineHeight: 18,
  },
});
