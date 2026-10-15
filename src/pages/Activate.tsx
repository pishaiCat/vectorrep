import { useEffect, useRef, useState } from 'react';
import { fetchJson, getPaidEmail, isPaid, verifyPurchaseByCheckout, verifyPurchaseByEmail } from '../lib/purchase';

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

export default function Activate({ paid, onPaidChange }: { paid: boolean; onPaidChange: (v: boolean) => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [returnState, setReturnState] = useState<ReturnState>('idle');
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const autoVerifiedRef = useRef(false);

  // Auto-verify when returning from Creem checkout with a checkout_id.
  useEffect(() => {
    if (autoVerifiedRef.current) return;
    const { checkoutId } = returnIdsFromUrl();
    if (!checkoutId) return;
    autoVerifiedRef.current = true;
    setReturnState('verifying');
    verifyPurchaseByCheckout(checkoutId)
      .then((ok) => {
        if (ok) {
          onPaidChange(true);
          setReturnState('verified');
          setMessage({ kind: 'success', text: 'Payment confirmed — unlimited unlocked on this device.' });
        } else {
          setReturnState('failed');
          setMessage({ kind: 'error', text: 'We could not confirm that payment yet. It may still be processing — wait a minute and retry, or restore with your checkout email below.' });
        }
      })
      .catch((err) => {
        setReturnState('failed');
        setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Verification failed.' });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buy = async () => {
    setCheckoutBusy(true);
    setMessage(null);
    try {
      const { ok, data } = await fetchJson('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const checkoutUrl = data?.checkout_url as string | undefined;
      if (!ok || !checkoutUrl) {
        throw new Error((data?.error as string | undefined) ?? 'Payments are temporarily unavailable — please try again or contact support.');
      }
      window.location.href = checkoutUrl;
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Checkout failed.' });
    } finally {
      setCheckoutBusy(false);
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
        setMessage({ kind: 'success', text: 'Payment confirmed — unlimited unlocked on this device.' });
      } else {
        setReturnState('failed');
        setMessage({ kind: 'error', text: 'Still not confirmed. If the payment went through, restore with your checkout email below.' });
      }
    } catch (err) {
      setReturnState('failed');
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Verification failed.' });
    }
  };

  const restore = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const ok = await verifyPurchaseByEmail(email);
      if (ok) {
        onPaidChange(true);
        setMessage({ kind: 'success', text: 'Purchase found — unlimited unlocked on this device.' });
        setEmail('');
      } else {
        setMessage({ kind: 'error', text: 'No paid purchase found for that email. Check the email you used at checkout, or buy below.' });
      }
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Restore failed.' });
    } finally {
      setBusy(false);
    }
  };

  const paidEmail = getPaidEmail();

  return (
    <div className="container narrow">
      <h1>Get access</h1>
      {paid ? (
        <div className="card">
          <p><strong>Paid — unlimited on this device.</strong></p>
          {paidEmail && <p className="small muted">Restored with: {paidEmail}</p>}
          <p className="small muted">Unlimited conversions · Full SVG · DXF · Vector PDF · PNG up to 3x · Batch ZIP. 14-day refunds — contact support with your order email.</p>
          <p className="small muted">On another device? Open this page there and restore with your checkout email — no key needed.</p>
          <p><a className="btn btn-primary" href="#/app">Open the Studio</a></p>
        </div>
      ) : (
        <>
          {returnState === 'verifying' && (
            <div className="notice" style={{ marginBottom: 16 }}>Confirming your payment… this usually takes a few seconds.</div>
          )}
          {returnState === 'failed' && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>Payment not confirmed yet</h3>
              <p className="muted">The payment may still be processing. Retry the check, or restore with your checkout email below.</p>
              <button className="btn" onClick={() => void retryReturn()} disabled={busy}>Retry confirmation</button>
            </div>
          )}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Buy — $79 once</h3>
            <p className="muted">Unlimited conversions, full SVG, DXF, vector PDF, PNG up to 3x, batch ZIP. Checkout is handled by Creem. After payment you return here automatically and the app unlocks itself — no key to copy or paste.</p>
            <button className="btn btn-primary" onClick={() => void buy()} disabled={checkoutBusy}>
              {checkoutBusy ? 'Opening checkout…' : 'Buy VectorNest — $79'}
            </button>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Already paid? Restore access</h3>
            <p className="muted">Enter the email you used at checkout. We&apos;ll check for your purchase and unlock this device.</p>
            <form onSubmit={(e) => void restore(e)}>
              <label className="field" htmlFor="restore-email">Checkout email</label>
              <input id="restore-email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              <button className="btn btn-primary" type="submit" disabled={busy || !email.trim()}>
                {busy ? 'Checking…' : 'Restore purchase'}
              </button>
            </form>
          </div>
        </>
      )}
      {message && <div className={message.kind === 'error' ? 'error' : 'success'} style={{ marginTop: 16 }}>{message.text}</div>}
      <p className="small muted" style={{ marginTop: 16 }}>
        Not paid yet? The free tier (3 conversions/day, watermarked SVG, PNG up to 1024px) needs nothing — <a href="#/app">open the Studio</a>.
        Paid status is checked on this device only: {isPaid() ? 'paid' : 'free tier'}.
      </p>
    </div>
  );
}
