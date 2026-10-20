/**
 * Auth + plan context.
 *
 * Sign-in is OPTIONAL and exists for one reason: paid access that follows
 * the buyer across devices. Guests can still buy (checkout → return →
 * auto-unlock on that device via /api/verify-purchase); signing in and
 * claiming links the purchase to the account (/api/claim), and the plan
 * is then read from /api/access on every sign-in.
 *
 * If Firebase is not configured on this deployment (VITE_FIREBASE_*
 * missing), everything here no-ops: user stays null, plan stays 'free',
 * and the UI shows a "sign-in not configured" notice where offered.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { EMAIL_FOR_SIGNIN_KEY, firebaseAuth, firebaseReady } from './firebaseClient';
import { fetchJson } from './purchase';

export type Plan = 'lifetime' | 'pass3' | 'free';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  plan: Plan;
  planActive: boolean;
  planExpiresAt: string | null;
  firebaseReady: boolean;
  refreshPlan: () => Promise<void>;
  signInGoogle: () => Promise<void>;
  sendEmailLink: (email: string) => Promise<void>;
  /** Complete an email-link sign-in if the current URL is one. Returns
   *  true when a sign-in was completed. Used by the Account page. */
  completeEmailLink: (emailFromUser?: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan>('free');
  const [planActive, setPlanActive] = useState(false);
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const userRef = useRef<User | null>(null);

  const fetchPlan = useCallback(async (u: User | null) => {
    if (!u) {
      setPlan('free');
      setPlanActive(false);
      setPlanExpiresAt(null);
      return;
    }
    try {
      const token = await u.getIdToken();
      const { ok, data } = await fetchJson('/api/access', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!ok || !data) throw new Error('access check failed');
      const p = data.plan as Plan | undefined;
      setPlan(p === 'lifetime' || p === 'pass3' ? p : 'free');
      setPlanActive(data.active === true);
      setPlanExpiresAt(typeof data.expiresAt === 'string' ? data.expiresAt : null);
    } catch {
      // Plan check failed (network/API down): stay on free rather than
      // wrongly granting or revoking access mid-session.
      setPlan('free');
      setPlanActive(false);
      setPlanExpiresAt(null);
    }
  }, []);

  const refreshPlan = useCallback(async () => {
    await fetchPlan(userRef.current);
  }, [fetchPlan]);

  useEffect(() => {
    if (!firebaseReady || !firebaseAuth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(firebaseAuth, (u) => {
      userRef.current = u;
      setUser(u);
      setLoading(false);
      void fetchPlan(u);
    });
    return unsub;
  }, [fetchPlan]);

  const signInGoogle = useCallback(async () => {
    if (!firebaseReady || !firebaseAuth) return;
    await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
  }, []);

  const sendEmailLink = useCallback(async (email: string) => {
    if (!firebaseReady || !firebaseAuth) return;
    const clean = email.trim().toLowerCase();
    await sendSignInLinkToEmail(firebaseAuth, clean, {
      url: `${window.location.origin}/#/account`,
      handleCodeInApp: true,
    });
    try {
      localStorage.setItem(EMAIL_FOR_SIGNIN_KEY, clean);
    } catch {
      // Storage unavailable — the Account page will ask for the email again.
    }
  }, []);

  const completeEmailLink = useCallback(async (emailFromUser?: string): Promise<boolean> => {
    if (!firebaseReady || !firebaseAuth) return false;
    if (!isSignInWithEmailLink(firebaseAuth, window.location.href)) return false;
    let email = emailFromUser?.trim().toLowerCase() || '';
    if (!email) {
      try {
        email = localStorage.getItem(EMAIL_FOR_SIGNIN_KEY) ?? '';
      } catch {
        email = '';
      }
    }
    if (!email) return false; // Account page prompts for the email, then retries.
    await signInWithEmailLink(firebaseAuth, email, window.location.href);
    try {
      localStorage.removeItem(EMAIL_FOR_SIGNIN_KEY);
    } catch {
      // ignore
    }
    return true;
  }, []);

  const signOut = useCallback(async () => {
    if (!firebaseReady || !firebaseAuth) return;
    await firebaseSignOut(firebaseAuth);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    plan,
    planActive,
    planExpiresAt,
    firebaseReady,
    refreshPlan,
    signInGoogle,
    sendEmailLink,
    completeEmailLink,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}
