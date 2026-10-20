import { useEffect, useRef, useState } from 'react';
import { fetchJson, getPaidEmail, verifyPurchaseByCheckout } from '../lib/purchase';
import { useAuth } from '../lib/auth';

/** Checkout/order ids Creem appends to the success URL. Creem may put them
 *  in the real query string (?checkout_id=…#/activate) or in the hash query
 *  (#/activate?checkout_id=…) depending on how it appends — check both. */
function returnIdsFromUrl(): { checkoutId: string | null; orderId: string | null } {
  const fromSearch = new URLSearchParams(window.location.search);
  const hashQuery = window.location.hash.split('?')[1] ?? '';
  const fromHash = new URLSearchParams(hashQuery);
  return {
    checkoutId: fromSearch.get('checkout_id') || fromHash.get('checkout_id'),
    orderId: fromSearch.get('order_id') || fromHash.get('order_id'),
  };
}

type ReturnState = 'idle' | 'verifying' | 'verified' | 'failed';
type PlanChoice = 'lifetime' | 'pass3';

export default function Activate({ paid, onPaidChange }: { paid: boolean; onPaidChange: (v: boolean) => void }) {
  const { user, plan, planActive, planExpiresAt, refreshPlan } = useAuth();
  const [busyPlan, setBusyPlan] = useState<PlanChoice | null>(null);
  const [returnState, setReturnState] = useState<ReturnState>('idle');
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const autoVerifiedRef = useRef(false);

  // Auto-verify when returning from Creem checkout with a checkout_id,
  // then auto-claim the purchase onto the signed-in account (buying
  // requires an account, so the buyer is normally signed in here).
  useEffect(() => {
    if (autoVerifiedRef.current) return;
    const { checkoutId } = returnIdsFromUrl();
    if (!checkoutId) return;
    autoVerifiedRef.current = true;
    setReturnState('verifying');
    verifyPurchaseByCheckout(checkoutId)
      .then(async (ok) => {
        if (ok) {
          onPaidChange(true);
          setReturnState('verified');
          setMessage({ kind: 'success', text: 'Payment confirmed — unlocked on this device.' });
          if (user) {
            try {
              const token = await user.getIdToken();
              const { ok: claimOk } = await fetchJson('/api/claim', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ checkout_id: checkoutId }),
              });
              if (claimOk) {
                await refreshPlan();
                setMessage({ kind: 'success', text: 'Payment confirmed — your plan is on your account and works on any device you sign in on.' });
              }
            } catch {
              // Device unlock already succeeded; claiming can be retried
              // from the Account page.
            }
          }
        } else {
          setReturnState('failed');
          setMessage({ kind: 'error', text: 'We could not confirm that payment yet. It may still be processing — wait a minute and retry.' });
        }
      })
      .catch((err) => {
        setReturnState('failed');
        setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Verification failed.' });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buy = async (planChoice: PlanChoice) => {
    if (!user) {
      // Account first, then buy (per product decision 2026-10-20).
      try {
        sessionStorage.setItem('vectornest_return_to', 'activate');
      } catch {
        // ignore
      }
      setMessage({ kind: 'error', text: 'Create your account first — it takes a few seconds, then you can buy and your plan attaches to the account automatically.' });
      window.location.hash = '#/account';
      return;
    }
    setBusyPlan(planChoice);
    setMessage(null);
    try {
      const { ok, data } = await fetchJson('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planChoice }),
      });
      const checkoutUrl = data?.checkout_url as string | undefined;
      if (!ok || !checkoutUrl) {
        throw new Error((data?.error as string | undefined) ?? 'Payments are temporarily unavailable — please try again or contact support.');
      }
      window.location.href = checkoutUrl;
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Checkout failed.' });
    } finally {
      setBusyPlan(null);
    }
  };

  const retryReturn = async () => {
    const { checkoutId } = returnIdsFromUrl();
    if (!checkoutId) return;
    setReturnState('verifying');
    setMessage(null);
    try {
      const ok = await verifyPurchaseByCheckout(checkoutId);
      if (ok) {
        onPaidChange(true);
        setReturnState('verified');
        setMessage({ kind: 'success', text: 'Payment confirmed — unlocked on this device.' });
      } else {
        setReturnState('failed');
        setMessage({ kind: 'error', text: 'Still not confirmed. If the payment went through, sign in and claim it from the Account page.' });
      }
    } catch (err) {
      setReturnState('failed');
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Verification failed.' });
    }
  };

  const paidEmail = getPaidEmail();
  const justVerified = returnState === 'verified';

  return (
    <div className="container narrow">
      <h1>Get access</h1>

      {returnState === 'verifying' && (
        <div className="notice" style={{ marginBottom: 16 }}>Confirming your payment… this usually takes a few seconds.</div>
      )}
      {returnState === 'failed' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Payment not confirmed yet</h3>
          <p className="muted">The payment may still be processing. Retry the check — or sign in and claim the purchase from your account.</p>
          <button className="btn" onClick={() => void retryReturn()}>Retry confirmation</button>{' '}
          <a className="btn" href="#/account">Go to Account</a>
        </div>
      )}

      {justVerified && !user && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Attach this purchase to your account</h3>
          <p className="muted">
            Your purchase is unlocked on this device right now. Sign in with the account you
            want it on and claim it once, and the same access works on any device.
          </p>
          <p>
            <a className="btn btn-primary" href="#/account">Sign in &amp; claim purchase</a>{' '}
            <a className="btn" href="#/app">Open the Studio</a>
          </p>
        </div>
      )}

      {paid ? (
        <div className="card">
          <p>
            <strong>
              {planActive && plan === 'lifetime'
                ? 'Lifetime — unlimited, on every device you sign in on.'
                : planActive && plan === 'pass3'
                  ? `3-Day Pass — active${planExpiresAt ? ` until ${new Date(planExpiresAt).toLocaleString()}` : ''}.`
                  : 'Paid — unlimited on this device.'}
            </strong>
          </p>
          {paidEmail && <p className="small muted">Restored with: {paidEmail}</p>}
          <p className="small muted">Unlimited conversions · Clean SVG · DXF · Vector PDF · PNG up to 3x · Batch ZIP. 14-day refunds — contact support with your order email.</p>
          {!user && (
            <p className="small muted">
              Using another device? <a href="#/account">Sign in and claim your purchase</a> there — no key to copy or paste.
            </p>
          )}
          <p><a className="btn btn-primary" href="#/app">Open the Studio</a></p>
        </div>
      ) : (
        <>
          {!user && (
            <div className="notice" style={{ marginBottom: 16 }}>
              <strong>Step 1: create your account.</strong> Buying requires an account (Google, or
              email + password) so your plan is yours on every device — no account, no checkout.{' '}
              <a href="#/account" onClick={() => { try { sessionStorage.setItem('vectornest_return_to', 'activate'); } catch { /* ignore */ } }}>Create account / Sign in →</a>
            </div>
          )}
          <div className="grid-2">
            <div className="card price-card">
              <h3 style={{ marginTop: 0 }}>3-Day Pass</h3>
              <p className="price">$3.99 <small>once — 72 hours</small></p>
              <p className="muted">
                Everything unlocked for 3 days: unlimited conversions, clean SVG, DXF, vector PDF,
                PNG up to 3x, batch ZIP, all machine presets. One project to finish? This is the one.
                One-time payment — <strong>not</strong> a subscription, nothing auto-renews.
              </p>
              <button className="btn btn-primary" onClick={() => void buy('pass3')} disabled={busyPlan !== null}>
                {busyPlan === 'pass3' ? 'Opening checkout…' : user ? 'Get the 3-Day Pass — $3.99' : 'Create account to buy — $3.99'}
              </button>
            </div>
            <div className="card price-card">
              <h3 style={{ marginTop: 0 }}>Lifetime</h3>
              <p className="price">$79 <small>once, forever (v1.x)</small></p>
              <p className="muted">
                The same full access, forever. Convert regularly for a shop or product line?
                This pays for itself against $9.99/month subscriptions in about 8 months — then it&apos;s yours.
              </p>
              <button className="btn btn-primary" onClick={() => void buy('lifetime')} disabled={busyPlan !== null}>
                {busyPlan === 'lifetime' ? 'Opening checkout…' : user ? 'Buy VectorNest — $79' : 'Create account to buy — $79'}
              </button>
            </div>
          </div>
          <p className="small muted" style={{ marginTop: 12 }}>
            Checkout is handled by Creem. After payment you return here automatically, the app unlocks
            itself, and your plan attaches to your account — sign in on any device and it is there.
          </p>
          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Already paid? Restore access</h3>
            <p className="muted">
              Sign in with the email you used at checkout and claim your purchase — your plan
              (Lifetime or 3-Day Pass) attaches to your account and works on any device.
            </p>
            <p><a className="btn btn-primary" href="#/account">Go to Account — sign in &amp; claim</a></p>
          </div>
        </>
      )}
      {message && <div className={message.kind === 'error' ? 'error' : 'success'} style={{ marginTop: 16 }}>{message.text}</div>}
      <p className="small muted" style={{ marginTop: 16 }}>
        Not paid yet? The free tier (10 conversions/day, clean SVG, PNG up to 1024px) needs nothing —{' '}
        <a href="#/app">open the Studio</a> or try the <a href="#/free/png-to-svg">free converters</a>.
      </p>
    </div>
  );
}
