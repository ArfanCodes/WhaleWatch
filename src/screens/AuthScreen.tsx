import React, { useState, useEffect } from 'react';
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
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { colors, font, radius, space, type } from '../theme';

WebBrowser.maybeCompleteAuthSession();

// The redirect must be whitelisted in Supabase Auth → URL Configuration.
const REDIRECT_URI = 'whalewatch://auth-callback';

type Step = 'landing' | 'email_input' | 'check_email';

export default function AuthScreen() {
  const [step, setStep] = useState<Step>('landing');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Deep-link handler: catch magic-link redirect and set session ──────────
  async function handleUrl(url: string) {
    if (!supabase || !url) return;
    try {
      const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }
    } catch (_) {}
  }

  useEffect(() => {
    Linking.getInitialURL().then(url => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  // ── Google sign-in ────────────────────────────────────────────────────────
  async function handleGoogle() {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: REDIRECT_URI, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned');
      const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URI);
      if (result.type === 'success') await handleUrl(result.url);
    } catch (e: any) {
      Alert.alert('Google sign-in failed', e.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Magic link: send ──────────────────────────────────────────────────────
  async function handleSendLink() {
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
        options: {
          shouldCreateUser: true,
          emailRedirectTo: REDIRECT_URI,
        },
      });
      if (error) throw error;
      setStep('check_email');
    } catch (e: any) {
      Alert.alert('Could not send link', e.message ?? 'Please try again.');
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
          {/* ── Landing ── */}
          {step === 'landing' && (
            <>
              <View style={styles.hero}>
                <Text style={styles.logo}>🐋</Text>
                <Text style={styles.appName}>WhaleWatch</Text>
                <Text style={styles.tagline}>Whale moves + crowd mood, fused.</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Sign in to continue</Text>

                <Pressable
                  onPress={handleGoogle}
                  style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.bg} size="small" />
                  ) : (
                    <>
                      <Text style={styles.googleG}>G</Text>
                      <Text style={styles.googleLabel}>Continue with Google</Text>
                    </>
                  )}
                </Pressable>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable
                  onPress={() => setStep('email_input')}
                  style={({ pressed }) => [styles.emailBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.emailLabel}>Continue with email</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* ── Email input ── */}
          {step === 'email_input' && (
            <>
              <View style={styles.hero}>
                <Text style={styles.logo}>🐋</Text>
                <Text style={styles.appName}>WhaleWatch</Text>
              </View>

              <View style={styles.card}>
                <Pressable onPress={() => setStep('landing')} style={styles.backBtn}>
                  <Text style={styles.backText}>← Back</Text>
                </Pressable>

                <Text style={styles.cardTitle}>Enter your email</Text>
                <Text style={styles.cardSub}>
                  We'll send you a sign-in link — no password needed.
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
                  onSubmitEditing={handleSendLink}
                />

                <Pressable
                  onPress={handleSendLink}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    (!email.trim() || loading) && styles.primaryBtnDisabled,
                    pressed && styles.pressed,
                  ]}
                  disabled={loading || !email.trim()}
                >
                  {loading
                    ? <ActivityIndicator color={colors.bg} size="small" />
                    : <Text style={styles.primaryLabel}>Send sign-in link</Text>
                  }
                </Pressable>
              </View>
            </>
          )}

          {/* ── Check email ── */}
          {step === 'check_email' && (
            <>
              <View style={styles.hero}>
                <Text style={styles.inboxIcon}>📬</Text>
                <Text style={styles.appName}>Check your email</Text>
                <Text style={styles.tagline}>We sent a sign-in link to</Text>
                <Text style={styles.emailHighlight}>{email.trim()}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.checkInstruction}>
                  Open the link in the email and you'll be signed in automatically.
                </Text>

                <View style={styles.stepRow}>
                  <View style={styles.stepBubble}><Text style={styles.stepNum}>1</Text></View>
                  <Text style={styles.stepText}>Open your email app</Text>
                </View>
                <View style={styles.stepRow}>
                  <View style={styles.stepBubble}><Text style={styles.stepNum}>2</Text></View>
                  <Text style={styles.stepText}>Tap the sign-in link from WhaleWatch</Text>
                </View>
                <View style={styles.stepRow}>
                  <View style={styles.stepBubble}><Text style={styles.stepNum}>3</Text></View>
                  <Text style={styles.stepText}>You'll be brought back here, signed in</Text>
                </View>

                <View style={styles.dividerRow} />

                <Pressable
                  onPress={handleSendLink}
                  style={({ pressed }) => [styles.resendBtn, pressed && styles.pressed]}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color={colors.neon} size="small" />
                    : <Text style={styles.resendText}>Resend link</Text>
                  }
                </Pressable>

                <Pressable
                  onPress={() => { setStep('email_input'); }}
                  style={({ pressed }) => [styles.changeEmailBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.changeEmailText}>Use a different email</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space.xl },

  hero: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 60, marginBottom: space.sm },
  inboxIcon: { fontSize: 60, marginBottom: space.sm },
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
  emailHighlight: {
    color: colors.neon,
    fontSize: font.md,
    fontFamily: type.semibold,
    marginTop: 4,
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
    marginTop: space.sm,
  },
  googleG: {
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

  primaryBtn: {
    backgroundColor: colors.neon,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryLabel: {
    color: colors.bg,
    fontSize: font.md,
    fontFamily: type.extrabold,
  },

  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  backBtn: { marginBottom: space.md },
  backText: { color: colors.textDim, fontSize: font.sm, fontFamily: type.medium },

  // Check email step
  checkInstruction: {
    color: colors.textDim,
    fontSize: font.sm,
    fontFamily: type.regular,
    lineHeight: 20,
    marginBottom: space.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.md,
  },
  stepBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neon + '22',
    borderWidth: 1,
    borderColor: colors.neon + '55',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
  },
  stepNum: { color: colors.neon, fontSize: font.xs, fontFamily: type.extrabold },
  stepText: { color: colors.text, fontSize: font.sm, fontFamily: type.medium, flex: 1 },

  resendBtn: {
    borderWidth: 1,
    borderColor: colors.neon + '55',
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: space.md,
  },
  resendText: { color: colors.neon, fontSize: font.sm, fontFamily: type.bold },

  changeEmailBtn: { alignItems: 'center', paddingVertical: space.sm },
  changeEmailText: { color: colors.textFaint, fontSize: font.sm, fontFamily: type.medium },
});
