/**
 * Firebase client (browser) setup — used ONLY for sign-in (Auth) and
 * calling the plan endpoints with an ID token. All image tracing still
 * runs 100% locally; Firebase never sees user images.
 *
 * Config comes from VITE_FIREBASE_* env vars (set in Vercel). If any var
 * is missing, `firebaseReady` is false, app/auth are null, and every
 * auth helper no-ops gracefully — the rest of the app must not crash.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const firebaseReady: boolean = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId,
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

if (firebaseReady) {
  try {
    app = initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    });
    authInstance = getAuth(app);
  } catch {
    app = null;
    authInstance = null;
  }
}

export const firebaseApp: FirebaseApp | null = app;
export const firebaseAuth: Auth | null = authInstance;

/** localStorage key holding the email an email-link sign-in was sent to. */
export const EMAIL_FOR_SIGNIN_KEY = 'vectornest_email_for_signin';
