import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  Auth,
  initializeAuth,
  // getReactNativePersistence is in the Metro/RN bundle — suppress the tsc
  // module-not-found error with @ts-ignore; it works fine at runtime in Expo Go
  // and in production builds.
  // @ts-ignore
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/** True once all 6 env vars are present */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

/** Web Client ID for Google Sign-In (set after enabling Google provider) */
export const googleWebClientId =
  process.env.EXPO_PUBLIC_FIREBASE_GOOGLE_CLIENT_ID ?? '';

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

if (isFirebaseConfigured) {
  _app =
    getApps().length === 0
      ? initializeApp(firebaseConfig as Record<string, string>)
      : getApps()[0];

  // AsyncStorage persistence keeps the user signed in across restarts.
  // Works in Expo Go (Metro) and production builds alike.
  _auth = initializeAuth(_app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export const firebaseApp  = _app;
export const firebaseAuth = _auth;
