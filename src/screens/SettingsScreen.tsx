import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { colors, font, radius, space, type } from '../theme';
import { signOut } from 'firebase/auth';
import { firebaseAuth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          if (firebaseAuth) await signOut(firebaseAuth);
          setSigningOut(false);
        },
      },
    ]);
  }

  const displayName = user?.displayName ?? user?.email ?? 'Signed in';
  const provider = user?.providerData?.[0]?.providerId === 'google.com' ? 'Google' : 'Email';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Settings" subtitle="How WhaleWatch is tuned" />

        {/* Account section */}
        {user ? (
          <>
            <Text style={styles.section}>Account</Text>
            <View style={styles.card}>
              <Row label="Signed in as" value={displayName} />
              <Row label="Sign-in method" value={provider} />
            </View>

            <Pressable
              onPress={handleSignOut}
              disabled={signingOut}
              style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}
            >
              {signingOut ? (
                <ActivityIndicator color={colors.fearful} size="small" />
              ) : (
                <Text style={styles.signOutLabel}>Sign out</Text>
              )}
            </Pressable>
          </>
        ) : null}

        <Text style={styles.section}>Alert rules</Text>
        <View style={styles.card}>
          <Row label="Tracked coin" value="Ethereum" />
          <Row label="Whale threshold" value="$250K and up" />
          <Row label="Tier 1" value="$1M+" />
          <Row label="Tier 2" value="$5M+" />
          <Row label="Tier 3" value="$10M+" />
          <Row label="Push limit" value="No cap (every move)" />
        </View>

        <Text style={styles.section}>About</Text>
        <View style={styles.card}>
          <Row label="Version" value="0.1.0 · Phase 1" />
          <Row label="Mode" value="Dark" />
          <Row label="Mood scoring" value="Google Gemini" />
        </View>
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
  value: { color: colors.text, fontSize: font.sm, fontFamily: type.bold, flexShrink: 1, textAlign: 'right', marginLeft: space.md },
  signOutBtn: {
    backgroundColor: colors.fearful + '15',
    borderWidth: 1,
    borderColor: colors.fearful + '55',
    borderRadius: radius.md,
    marginHorizontal: space.lg,
    marginTop: space.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pressed: { opacity: 0.75 },
  signOutLabel: {
    color: colors.fearful,
    fontSize: font.md,
    fontFamily: type.bold,
  },
});
