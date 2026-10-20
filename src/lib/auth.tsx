/**
 * Auth + plan context.
 *
 * An account is REQUIRED to buy: the Get access page routes signed-out
 * visitors here first (Google, or email + password — no email-link
 * sign-in). After checkout the purchase is claimed onto the account
 * (/api/claim) and the plan is read from /api/access on every sign-in,
 * so paid access follows the buyer across devices. The free tier and
 * the free converter pages never need an account.
 *
 * If Firebase is not configured on this deployment (VITE_FIREBASE_*
 * missing), everything here no-ops: user stays null, plan stays 'free',
 * and the UI shows a "sign-in not configured" notice where offered.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { firebaseAuth, firebaseReady } from './firebaseClient';
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
  signUpEmail: (email: string, password: string) => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
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

  const signUpEmail = useCallback(async (email: string, password: string) => {
    if (!firebaseReady || !firebaseAuth) return;
    await createUserWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);
  }, []);

  const signInEmail = useCallback(async (email: string, password: string) => {
    if (!firebaseReady || !firebaseAuth) return;
    await signInWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);
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
    signUpEmail,
    signInEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}
