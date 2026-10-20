import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { fetchJson } from '../lib/purchase';

function planLabel(plan: string, active: boolean, expiresAt: string | null): string {
  if (plan === 'lifetime') return 'Lifetime — full access, forever';
  if (plan === 'pass3') {
    return active && expiresAt
      ? `3-Day Pass — active until ${new Date(expiresAt).toLocaleString()}`
      : '3-Day Pass — expired';
  }
  return 'Free — 10 conversions a day';
}

/** Friendly text for Firebase email/password auth errors. */
function authErrorText(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email already has an account — use "Sign in" below instead.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email and password do not match an account. Check them, or create the account first.';
    case 'auth/weak-password':
      return 'Password is too weak — use at least 6 characters.';
    case 'auth/invalid-email':
      return 'That email address does not look right.';
    case 'auth/too-many-requests':
      return 'Too many attempts — wait a minute and try again.';
    default:
      return 'Sign-in failed. Please try again.';
  }
}

const RETURN_KEY = 'vectornest_return_to';

export default function Account() {
  const { user, loading, plan, planActive, planExpiresAt, firebaseReady, refreshPlan, signInGoogle, signUpEmail, signInEmail, signOut } = useAuth();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [returnToBuy] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(RETURN_KEY) === 'activate';
    } catch {
      return false;
    }
  });

  const continueToBuy = () => {
    try {
      sessionStorage.removeItem(RETURN_KEY);
    } catch {
      // ignore
    }
    window.location.hash = '#/activate';
  };

  const emailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'signup') {
        await signUpEmail(email, password);
        setMessage({ kind: 'success', text: 'Account created — you are signed in.' });
      } else {
        await signInEmail(email, password);
        setMessage({ kind: 'success', text: 'Signed in — welcome back.' });
      }
      setPassword('');
    } catch (err) {
      if ((err as { code?: string })?.code === 'auth/email-already-in-use') setMode('signin');
      setMessage({ kind: 'error', text: authErrorText(err) });
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await signInGoogle();
    } catch {
      setMessage({ kind: 'error', text: 'Google sign-in was cancelled or failed. Try again, or use email + password.' });
    } finally {
      setBusy(false);
    }
  };

  const claim = async () => {
    if (!user) return;
    setClaiming(true);
    setMessage(null);
    try {
      const token = await user.getIdToken();
      const { ok, data } = await fetchJson('/api/claim', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!ok || !data) throw new Error((data?.error as string | undefined) ?? 'Claim failed.');
      await refreshPlan();
      const p = data.plan as string;
      if (p === 'lifetime') {
        setMessage({ kind: 'success', text: 'Purchase claimed — Lifetime access is now on your account.' });
      } else if (p === 'pass3' && data.active === true) {
        setMessage({ kind: 'success', text: `Purchase claimed — 3-Day Pass active until ${new Date(data.expiresAt as string).toLocaleString()}.` });
      } else if (p === 'pass3') {
        setMessage({ kind: 'error', text: 'Found a 3-Day Pass for this email, but it has expired.' });
      } else {
        setMessage({ kind: 'error', text: 'No purchase found for this account email. Purchases attach automatically when you buy while signed in.' });
      }
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Claim failed.' });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="container narrow">
      <h1>Account</h1>
      <p className="muted">
        An account is required to buy a plan — it takes a few seconds, and it means your
        plan follows you to any device. The free tier and free converters never need one.
        Your images are never uploaded, signed in or not.
      </p>

      {!firebaseReady ? (
        <div className="notice">
          <strong>Sign-in is not configured yet on this deployment.</strong>
          <p className="small muted" style={{ marginBottom: 0 }}>
            Buying is unavailable until accounts are configured. The free tier still works —{' '}
            <a href="#/app">open the Studio</a>.
          </p>
        </div>
      ) : loading ? (
        <div className="notice">Checking your sign-in…</div>
      ) : !user ? (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{mode === 'signup' ? 'Create your account' : 'Sign in'}</h3>
          <button className="btn btn-primary" onClick={() => void google()} disabled={busy}>
            Continue with Google
          </button>
          <p className="small muted" style={{ textAlign: 'center', margin: '12px 0 4px' }}>— or with email + password —</p>
          <form onSubmit={(e) => void emailPassword(e)}>
            <label className="field" htmlFor="auth-email">Email</label>
            <input id="auth-email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            <label className="field" htmlFor="auth-password">Password</label>
            <input id="auth-password" className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
            <button className="btn btn-primary" type="submit" disabled={busy || !email.trim() || !password}>
              {busy ? 'One moment…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>
          <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
            {mode === 'signup' ? (
              <>Already have an account? <a href="#/account" onClick={(e) => { e.preventDefault(); setMode('signin'); setMessage(null); }}>Sign in</a></>
            ) : (
              <>New here? <a href="#/account" onClick={(e) => { e.preventDefault(); setMode('signup'); setMessage(null); }}>Create an account</a></>
            )}
          </p>
          <p className="small muted">
            Tip: use the same email at checkout as on this account, so your purchase attaches automatically.
          </p>
        </div>
      ) : (
        <div className="card">
          <p><strong>Signed in as {user.email}</strong></p>
          <p>Your plan: <strong>{planLabel(plan, planActive, planExpiresAt)}</strong></p>
          {returnToBuy && plan === 'free' && (
            <div className="notice" style={{ marginBottom: 12 }}>
              <strong>Account ready.</strong> Continue to pick your plan and pay — it attaches to this account automatically.{' '}
              <button className="btn btn-primary btn-sm" onClick={continueToBuy}>Continue to checkout →</button>
            </div>
          )}
          <p className="small muted">
            Bought while signed in? Your plan is already on this account. If you ever paid with a
            different email, claim that purchase once here and it attaches to this account too.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => void claim()} disabled={claiming}>
              {claiming ? 'Checking purchases…' : 'Claim a purchase'}
            </button>
            <a className="btn btn-primary" href="#/app">Open the Studio</a>
            <button className="btn" onClick={() => void signOut()}>Sign out</button>
          </div>
          {plan === 'free' && (
            <p className="small muted">No plan yet? <a href="#/activate">3-Day Pass $3.99 or Lifetime $79</a> — one-time payments, no subscription.</p>
          )}
        </div>
      )}
      {message && <div className={message.kind === 'error' ? 'error' : 'success'} style={{ marginTop: 16 }}>{message.text}</div>}
    </div>
  );
}
