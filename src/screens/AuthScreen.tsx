import React, { useEffect, useState } from 'react';
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
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseAuth, isFirebaseConfigured, googleWebClientId } from '../lib/firebase';
import { colors, font, radius, space, type } from '../theme';

// Required by expo-auth-session to cleanly close the browser on Android
WebBrowser.maybeCompleteAuthSession();

type Tab = 'signin' | 'create';

export default function AuthScreen() {
  const [tab, setTab] = useState<Tab>('signin');
  const [loading, setLoading] = useState(false);

  // Google Sign-In via expo-auth-session
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    webClientId: googleWebClientId || undefined,
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params;
      if (!id_token || !isFirebaseConfigured || !firebaseAuth) return;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(firebaseAuth, credential)
        .catch((e: any) => Alert.alert('Google sign-in failed', e.message))
        .finally(() => setLoading(false));
    }
  }, [googleResponse]);

  // Sign in fields
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');

  // Create account fields
  const [caName, setCaName] = useState('');
  const [caUsername, setCaUsername] = useState('');
  const [caEmail, setCaEmail] = useState('');
  const [caPassword, setCaPassword] = useState('');
  const [caConfirm, setCaConfirm] = useState('');

  function firebaseErrorMessage(code: string): string {
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/invalid-credential': return 'No account found with those credentials.';
      case 'auth/wrong-password':     return 'Incorrect password.';
      case 'auth/email-already-in-use': return 'An account with this email already exists.';
      case 'auth/weak-password':      return 'Password must be at least 6 characters.';
      case 'auth/invalid-email':      return 'Enter a valid email address.';
      case 'auth/too-many-requests':  return 'Too many attempts. Try again later.';
      default:                        return 'Something went wrong. Please try again.';
    }
  }

  async function handleSignIn() {
    if (!isFirebaseConfigured || !firebaseAuth) {
      Alert.alert('Not configured', 'Add Firebase keys to .env to enable sign-in.');
      return;
    }
    const email = siEmail.trim().toLowerCase();
    const password = siPassword;
    if (!email || !password) {
      Alert.alert('Missing fields', 'Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      // onAuthStateChanged fires → useAuth updates → App.tsx shows tabs
    } catch (e: any) {
      Alert.alert('Sign in failed', firebaseErrorMessage(e.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!isFirebaseConfigured || !firebaseAuth) {
      Alert.alert('Not configured', 'Add Firebase keys to .env to enable sign-up.');
      return;
    }
    const name     = caName.trim();
    const username = caUsername.trim().toLowerCase().replace(/\s+/g, '');
    const email    = caEmail.trim().toLowerCase();
    const password = caPassword;
    const confirm  = caConfirm;

    if (!name || !username || !email || !password || !confirm) {
      Alert.alert('Missing fields', 'Fill in all fields to create your account.');
      return;
    }
    if (username.length < 3) {
      Alert.alert('Username too short', 'Username must be at least 3 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords don\'t match', 'Check your confirm password field.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await AsyncStorage.setItem('@ww_username', username);
      // onAuthStateChanged fires → App.tsx shows tabs automatically
    } catch (e: any) {
      Alert.alert('Sign up failed', firebaseErrorMessage(e.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!googleWebClientId) {
      Alert.alert(
        'Google not configured',
        'Enable Google sign-in in Firebase console and add EXPO_PUBLIC_FIREBASE_GOOGLE_CLIENT_ID to .env.',
      );
      return;
    }
    if (!googleRequest) {
      Alert.alert('Not ready', 'Google sign-in is still initialising — try again.');
      return;
    }
    await promptGoogleAsync();
  }

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
          {/* ── Hero ── */}
          <View style={styles.hero}>
            <Text style={styles.logo}>🐋</Text>
            <Text style={styles.appName}>WhaleWatch</Text>
            <Text style={styles.tagline}>Whale moves + crowd mood, fused.</Text>
          </View>

          {/* ── Tab switcher ── */}
          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tabBtn, tab === 'signin' && styles.tabBtnActive]}
              onPress={() => setTab('signin')}
            >
              <Text style={[styles.tabLabel, tab === 'signin' && styles.tabLabelActive]}>
                Sign In
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, tab === 'create' && styles.tabBtnActive]}
              onPress={() => setTab('create')}
            >
              <Text style={[styles.tabLabel, tab === 'create' && styles.tabLabelActive]}>
                Create Account
              </Text>
            </Pressable>
          </View>

          {/* ── Sign In ── */}
          {tab === 'signin' && (
            <View style={styles.card}>
              <Field label="Email" value={siEmail} onChange={setSiEmail}
                keyboardType="email-address" placeholder="you@example.com" />
              <Field label="Password" value={siPassword} onChange={setSiPassword}
                secure placeholder="••••••••" />

              <Pressable
                onPress={handleSignIn}
                disabled={loading}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              >
                {loading
                  ? <ActivityIndicator color={colors.bg} size="small" />
                  : <Text style={styles.primaryLabel}>Sign In</Text>}
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                onPress={handleGoogleSignIn}
                style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}
              >
                <Text style={styles.googleG}>G</Text>
                <Text style={styles.googleLabel}>Continue with Google</Text>
              </Pressable>
            </View>
          )}

          {/* ── Create Account ── */}
          {tab === 'create' && (
            <View style={styles.card}>
              <Field label="Full Name" value={caName} onChange={setCaName}
                placeholder="Arfan Mohammed" autoCapitalize="words" />
              <Field label="Username" value={caUsername} onChange={setCaUsername}
                placeholder="arfancodes" autoCapitalize="none" />
              <Field label="Email" value={caEmail} onChange={setCaEmail}
                keyboardType="email-address" placeholder="you@example.com" />
              <Field label="Password" value={caPassword} onChange={setCaPassword}
                secure placeholder="Min 6 characters" />
              <Field label="Confirm Password" value={caConfirm} onChange={setCaConfirm}
                secure placeholder="Re-enter password" last />

              <Pressable
                onPress={handleCreate}
                disabled={loading}
                style={({ pressed }) => [styles.primaryBtn, { marginTop: space.md }, pressed && styles.pressed]}
              >
                {loading
                  ? <ActivityIndicator color={colors.bg} size="small" />
                  : <Text style={styles.primaryLabel}>Create Account</Text>}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Reusable input field ──────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, keyboardType, secure, autoCapitalize, last,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'email-address' | 'default';
  secure?: boolean;
  autoCapitalize?: 'none' | 'words' | 'sentences';
  last?: boolean;
}) {
  return (
    <View style={[styles.fieldWrap, !last && styles.fieldBorder]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        keyboardType={keyboardType ?? 'default'}
        secureTextEntry={secure}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoCorrect={false}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.xl, paddingVertical: space.xxl },

  hero: { alignItems: 'center', marginBottom: space.xl },
  logo:    { fontSize: 56, marginBottom: space.sm },
  appName: { color: colors.text, fontSize: font.xxl, fontFamily: type.black, letterSpacing: -1 },
  tagline: { color: colors.textDim, fontSize: font.sm, fontFamily: type.regular, marginTop: 4 },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.md,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabBtnActive: { backgroundColor: colors.neon + '22', borderWidth: 1, borderColor: colors.neon + '55' },
  tabLabel:       { color: colors.textFaint, fontSize: font.sm, fontFamily: type.semibold },
  tabLabelActive: { color: colors.neon },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.xl,
  },

  fieldWrap: { paddingVertical: 12 },
  fieldBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  fieldLabel: { color: colors.textDim, fontSize: font.xs, fontFamily: type.semibold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  fieldInput: {
    color: colors.text,
    fontSize: font.md,
    fontFamily: type.regular,
    paddingVertical: 0,
  },

  primaryBtn: {
    backgroundColor: colors.neon,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: space.lg,
  },
  primaryLabel: { color: colors.bg, fontSize: font.md, fontFamily: type.extrabold },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: space.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textFaint, fontSize: font.xs, fontFamily: type.medium, marginHorizontal: space.md },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  googleG:     { color: colors.text, fontSize: font.md, fontFamily: type.extrabold, marginRight: 10 },
  googleLabel: { color: colors.text, fontSize: font.md, fontFamily: type.semibold },

  pressed: { opacity: 0.8 },
});
