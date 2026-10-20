import { useEffect, useRef, useState } from 'react';
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

export default function Account() {
  const { user, loading, plan, planActive, planExpiresAt, firebaseReady, refreshPlan, signInGoogle, sendEmailLink, completeEmailLink, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [linkEmail, setLinkEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const linkTriedRef = useRef(false);

  // Email-link sign-in callback: if this page was opened from a sign-in
  // email, complete the sign-in (needs the email — stored when the link
  // was sent, or typed below if it wasn't).
  useEffect(() => {
    if (linkTriedRef.current || !firebaseReady) return;
    linkTriedRef.current = true;
    completeEmailLink()
      .then((done) => {
        if (done) setMessage({ kind: 'success', text: 'Signed in — welcome back.' });
      })
      .catch(() => {
        setMessage({ kind: 'error', text: 'That sign-in link did not work. Enter your email below to get a fresh one.' });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseReady]);

  const finishLinkWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const done = await completeEmailLink(linkEmail);
      setMessage(done
        ? { kind: 'success', text: 'Signed in — welcome back.' }
        : { kind: 'error', text: 'Could not complete sign-in with that email. Request a fresh link below.' });
    } catch {
      setMessage({ kind: 'error', text: 'Sign-in failed. Request a fresh link below.' });
    } finally {
      setBusy(false);
    }
  };

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await sendEmailLink(email);
      setMessage({ kind: 'success', text: `Sign-in link sent to ${email.trim()}. Open it on any device to sign in.` });
      setEmail('');
    } catch {
      setMessage({ kind: 'error', text: 'Could not send the sign-in link. Check the email and try again.' });
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
      setMessage({ kind: 'error', text: 'Google sign-in was cancelled or failed. Try again, or use the email link.' });
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
        setMessage({ kind: 'error', text: 'No purchase found for this account email. Sign in with the email you used at checkout.' });
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
        Sign-in is optional. It exists so paid access follows you to any device — buy once,
        sign in anywhere, and your plan is there. Your images are never uploaded, signed in or not.
      </p>

      {!firebaseReady ? (
        <div className="notice">
          <strong>Sign-in is not configured yet on this deployment.</strong>
          <p className="small muted" style={{ marginBottom: 0 }}>
            Paid access still works on the device you bought on. If you bought on another device,
            use <a href="#/activate">restore on the Get access page</a> in the meantime.
          </p>
        </div>
      ) : loading ? (
        <div className="notice">Checking your sign-in…</div>
      ) : !user ? (
        <>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Sign in</h3>
            <button className="btn btn-primary" onClick={() => void google()} disabled={busy}>
              Continue with Google
            </button>
            <p className="small muted">No password. Use the same email you used at checkout so your purchase can be claimed.</p>
            <form onSubmit={(e) => void sendLink(e)}>
              <label className="field" htmlFor="link-email">…or get a sign-in link by email</label>
              <input id="link-email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              <button className="btn" type="submit" disabled={busy || !email.trim()}>
                {busy ? 'Sending…' : 'Email me a sign-in link'}
              </button>
            </form>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Opened a sign-in link?</h3>
            <p className="muted">If the link opened here but you are not signed in, confirm the email it was sent to:</p>
            <form onSubmit={(e) => void finishLinkWithEmail(e)}>
              <label className="field" htmlFor="confirm-email">Email the link was sent to</label>
              <input id="confirm-email" className="input" type="email" required value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              <button className="btn" type="submit" disabled={busy || !linkEmail.trim()}>Complete sign-in</button>
            </form>
          </div>
        </>
      ) : (
        <div className="card">
          <p><strong>Signed in as {user.email}</strong></p>
          <p>Your plan: <strong>{planLabel(plan, planActive, planExpiresAt)}</strong></p>
          <p className="small muted">
            Bought VectorNest (or a 3-Day Pass) with this email? Claim it once and the plan
            attaches to this account — after that, just sign in on any device.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => void claim()} disabled={claiming}>
              {claiming ? 'Checking purchases…' : 'Claim purchase'}
            </button>
            <a className="btn" href="#/app">Open the Studio</a>
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
