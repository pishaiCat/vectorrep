import { useState } from 'react';
import { activateLicense, deactivateLicense, getStoredLicense, isPaid, fetchJson } from '../lib/license';

export default function Activate({ paid, onPaidChange }: { paid: boolean; onPaidChange: (v: boolean) => void }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const stored = getStoredLicense();

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

  const activate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const lic = await activateLicense(key);
      onPaidChange(true);
      setMessage({ kind: 'success', text: `Activated. Instance ${lic.instanceId.slice(0, 8)}… — paid features are unlocked on this device.` });
      setKey('');
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Activation failed.' });
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    setBusy(true);
    try {
      await deactivateLicense();
      onPaidChange(false);
      setMessage({ kind: 'success', text: 'Deactivated on this device. The seat is freed for another device.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container narrow">
      <h1>Activate VectorNest</h1>
      {paid ? (
        <div className="card">
          <p><strong>Paid license active on this device.</strong></p>
          {stored && <p className="small muted">Instance: {stored.instanceId}<br />Next server re-validation: {new Date(stored.validUntil).toLocaleString()}</p>}
          <p className="small muted">License: v1.x forever, up to 3 devices. 14-day refunds — contact support with your order email.</p>
          <button className="btn" onClick={() => void deactivate()} disabled={busy}>Deactivate on this device</button>
        </div>
      ) : (
        <>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Buy — $79 once</h3>
            <p className="muted">Unlimited conversions, full SVG, DXF, vector PDF, PNG up to 3x, batch ZIP. Checkout is handled by Creem; your license key is emailed automatically.</p>
            <button className="btn btn-primary" onClick={() => void buy()} disabled={checkoutBusy}>
              {checkoutBusy ? 'Opening checkout…' : 'Buy VectorNest — $79'}
            </button>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Already have a key? Paste it here</h3>
            <form onSubmit={(e) => void activate(e)}>
              <label className="field" htmlFor="license-key">License key</label>
              <input id="license-key" className="input" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste your license key" autoComplete="off" />
              <button className="btn btn-primary" type="submit" disabled={busy || !key.trim()}>
                {busy ? 'Verifying…' : 'Activate'}
              </button>
            </form>
            <p className="small muted" style={{ marginTop: 10 }}>
              Your key is verified server-side and stored in this browser only, so the app can re-validate it every 7 days.
              It is never sent anywhere except our own license endpoint.
            </p>
          </div>
        </>
      )}
      {message && <div className={message.kind === 'error' ? 'error' : 'success'} style={{ marginTop: 16 }}>{message.text}</div>}
      <p className="small muted" style={{ marginTop: 16 }}>
        Not paid yet? The free tier (3 conversions/day, watermarked SVG, PNG up to 1024px) needs no key — <a href="#/app">open the Studio</a>.
        Paid status is checked on this device only: {isPaid() ? 'paid' : 'free tier'}.
      </p>
    </div>
  );
}
