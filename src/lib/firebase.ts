import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { Auth, initializeAuth, inMemoryPersistence } from 'firebase/auth';

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

/** Web Client ID for Google Sign-In */
export const googleWebClientId =
  process.env.EXPO_PUBLIC_FIREBASE_GOOGLE_CLIENT_ID ?? '';

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

if (isFirebaseConfigured) {
  _app =
    getApps().length === 0
      ? initializeApp(firebaseConfig as Record<string, string>)
      : getApps()[0];

  // inMemoryPersistence works reliably in both Expo Go and production.
  // For cross-restart session persistence in a dev/production build, swap this
  // for getReactNativePersistence(AsyncStorage) from 'firebase/auth/react-native'
  // — that sub-path isn't available in Expo Go's Metro bundle.
  _auth = initializeAuth(_app, { persistence: inMemoryPersistence });
}

export const firebaseApp  = _app;
export const firebaseAuth = _auth;
