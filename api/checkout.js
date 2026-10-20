/**
 * POST /api/checkout { email?, plan? } -> { checkout_url }
 * Creates a Creem checkout session for one of the one-time products:
 *   plan 'lifetime' (default) → CREEM_PRODUCT_ID        ($79)
 *   plan 'pass3'              → CREEM_PRODUCT_ID_PASS3  ($3.99, 72h pass;
 *                               400 JSON if that env var is not set yet)
 * success_url points back at /#/activate — Creem automatically appends
 * ?checkout_id=…&order_id=…&customer_id=…&product_id=…&signature=… to it,
 * so the app can auto-verify the purchase on return (no key to paste).
 * Always returns JSON, even on unexpected errors.
 */
import { requireEnv, creemPost, isMethod } from './_creem.js';

/** Absolute URL of this deployment, from the request itself (works on
 *  production and preview deploys). Falls back to the production URL. */
function appBaseUrl(req) {
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host;
  if (typeof host === 'string' && host) {
    const proto = req.headers?.['x-forwarded-proto'] || 'https';
    return `${proto}://${host}`;
  }
  return 'https://vectornest-six.vercel.app';
}

export default async function handler(req, res) {
  try {
    if (!isMethod(req, res, 'POST')) return;
    const env = requireEnv(res);
    if (!env) return;
    let email;
    let plan = 'lifetime';
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      email = typeof body.email === 'string' ? body.email : undefined;
      if (body.plan === 'pass3') plan = 'pass3';
    } catch {
      email = undefined;
    }
    let productId = env.productId;
    if (plan === 'pass3') {
      productId = process.env.CREEM_PRODUCT_ID_PASS3 || '';
      if (!productId) {
        res.status(400).json({ error: '3-day pass is not configured yet.' });
        return;
      }
    } else if (!productId) {
      res.status(500).json({ error: 'Payments are not configured (CREEM_PRODUCT_ID missing).' });
      return;
    }
    const successUrl = process.env.CREEM_SUCCESS_URL || `${appBaseUrl(req)}/#/activate`;
    const { ok, data } = await creemPost(env.apiKey, '/checkouts', {
      product_id: productId,
      request_id: `vn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      success_url: successUrl,
      metadata: { source: 'vectornest-web', plan },
      ...(email ? { customer: { email } } : {}),
    });
    if (!ok) {
      res.status(502).json({ error: 'Could not create a checkout session. Please try again.' });
      return;
    }
    const checkoutUrl = data && (data.checkout_url || data.url || data.checkoutUrl);
    if (!checkoutUrl) {
      res.status(502).json({ error: 'Checkout session had no URL. Please try again.' });
      return;
    }
    res.status(200).json({ checkout_url: checkoutUrl });
  } catch {
    try {
      res.status(500).json({ error: 'Payment service temporarily unavailable. Please try again.' });
    } catch {
      // Response already sent — nothing more we can do.
    }
  }
}
