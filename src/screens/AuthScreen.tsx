import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../lib/supabase';
import { colors, font, radius, space, type } from '../theme';

WebBrowser.maybeCompleteAuthSession();

type Step = 'landing' | 'email_input' | 'otp_input';

export default function AuthScreen() {
  const [step, setStep] = useState<Step>('landing');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Google sign-in ────────────────────────────────────────────────────────
  async function handleGoogle() {
    if (!supabase) return;
    setLoading(true);
    try {
      const redirectTo = makeRedirectUri({ scheme: 'whalewatch', path: 'auth' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error('No auth URL');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const accessToken = url.searchParams.get('access_token') ??
          new URLSearchParams(url.hash.slice(1)).get('access_token');
        const refreshToken = url.searchParams.get('refresh_token') ??
          new URLSearchParams(url.hash.slice(1)).get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      }
    } catch (e: any) {
      Alert.alert('Google sign-in failed', e.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Email OTP: send code ──────────────────────────────────────────────────
  async function handleSendOtp() {
    if (!supabase) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setStep('otp_input');
    } catch (e: any) {
      Alert.alert('Could not send code', e.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Email OTP: verify code ────────────────────────────────────────────────
  async function handleVerifyOtp() {
    if (!supabase) return;
    const code = otp.trim();
    if (code.length !== 6) {
      Alert.alert('Invalid code', 'The code should be 6 digits.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: 'email',
      });
      if (error) throw error;
      // Auth state listener in useAuth() fires → main nav renders automatically.
    } catch (e: any) {
      Alert.alert('Invalid code', e.message ?? 'Check the code and try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / hero */}
          <View style={styles.hero}>
            <Text style={styles.logo}>🐋</Text>
            <Text style={styles.appName}>WhaleWatch</Text>
            <Text style={styles.tagline}>Whale moves + crowd mood, fused.</Text>
          </View>

          {/* Landing: two auth options */}
          {step === 'landing' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Sign in to continue</Text>

              {/* Google button */}
              <Pressable
                onPress={handleGoogle}
                style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.bg} size="small" />
                ) : (
                  <>
                    <Text style={styles.googleIcon}>G</Text>
                    <Text style={styles.googleLabel}>Continue with Google</Text>
                  </>
                )}
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Email button */}
              <Pressable
                onPress={() => setStep('email_input')}
                style={({ pressed }) => [styles.emailBtn, pressed && styles.pressed]}
              >
                <Text style={styles.emailLabel}>Continue with email</Text>
              </Pressable>
            </View>
          )}

          {/* Email input */}
          {step === 'email_input' && (
            <View style={styles.card}>
              <Pressable onPress={() => setStep('landing')} style={styles.backBtn}>
                <Text style={styles.backText}>← Back</Text>
              </Pressable>
              <Text style={styles.cardTitle}>Enter your email</Text>
              <Text style={styles.cardSub}>
                We'll send a 6-digit code — no password needed.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textFaint}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="send"
                onSubmitEditing={handleSendOtp}
              />
              <Pressable
                onPress={handleSendOtp}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                disabled={loading || !email.trim()}
              >
                {loading
                  ? <ActivityIndicator color={colors.bg} size="small" />
                  : <Text style={styles.primaryLabel}>Send code</Text>
                }
              </Pressable>
            </View>
          )}

          {/* OTP input */}
          {step === 'otp_input' && (
            <View style={styles.card}>
              <Pressable onPress={() => setStep('email_input')} style={styles.backBtn}>
                <Text style={styles.backText}>← Back</Text>
              </Pressable>
              <Text style={styles.cardTitle}>Check your email</Text>
              <Text style={styles.cardSub}>
                We sent a 6-digit code to{' '}
                <Text style={{ color: colors.neon }}>{email.trim()}</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="000000"
                placeholderTextColor={colors.textFaint}
                value={otp}
                onChangeText={t => setOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleVerifyOtp}
                maxLength={6}
              />
              <Pressable
                onPress={handleVerifyOtp}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                disabled={loading || otp.length !== 6}
              >
                {loading
                  ? <ActivityIndicator color={colors.bg} size="small" />
                  : <Text style={styles.primaryLabel}>Verify code</Text>
                }
              </Pressable>
              <Pressable onPress={handleSendOtp} style={styles.resendBtn} disabled={loading}>
                <Text style={styles.resendText}>Resend code</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space.xl },

  hero: { alignItems: 'center', marginBottom: 36 },
  logo: { fontSize: 64, marginBottom: space.sm },
  appName: {
    color: colors.text,
    fontSize: font.xxl,
    fontFamily: type.black,
    letterSpacing: -1,
  },
  tagline: {
    color: colors.textDim,
    fontSize: font.sm,
    fontFamily: type.regular,
    marginTop: 6,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xl,
  },
  cardTitle: {
    color: colors.text,
    fontSize: font.lg,
    fontFamily: type.extrabold,
    marginBottom: space.sm,
  },
  cardSub: {
    color: colors.textDim,
    fontSize: font.sm,
    fontFamily: type.regular,
    lineHeight: 20,
    marginBottom: space.lg,
  },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    marginTop: space.sm,
  },
  googleIcon: {
    color: colors.bg,
    fontSize: font.md,
    fontFamily: type.extrabold,
    marginRight: 10,
  },
  googleLabel: {
    color: colors.bg,
    fontSize: font.md,
    fontFamily: type.bold,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: space.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    color: colors.textFaint,
    fontSize: font.xs,
    fontFamily: type.medium,
    marginHorizontal: space.md,
  },

  emailBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  emailLabel: {
    color: colors.text,
    fontSize: font.md,
    fontFamily: type.semibold,
  },

  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    color: colors.text,
    fontSize: font.md,
    fontFamily: type.regular,
    marginBottom: space.lg,
  },
  otpInput: {
    fontSize: 28,
    fontFamily: type.extrabold,
    letterSpacing: 8,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },

  primaryBtn: {
    backgroundColor: colors.neon,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryLabel: {
    color: colors.bg,
    fontSize: font.md,
    fontFamily: type.extrabold,
  },

  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },

  backBtn: { marginBottom: space.md },
  backText: { color: colors.textDim, fontSize: font.sm, fontFamily: type.medium },

  resendBtn: { alignItems: 'center', marginTop: space.lg },
  resendText: { color: colors.neon, fontSize: font.sm, fontFamily: type.semibold },
});
