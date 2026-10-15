/**
 * POST /api/checkout { email? } -> { checkout_url }
 * Creates a Creem checkout session for the $79 one-time VectorNest product.
 * The product id comes from CREEM_PRODUCT_ID (never hardcoded, never a real
 * value in this repo). No license key is involved here.
 */
import { requireEnv, creemPost, isMethod } from './_creem';

export default async function handler(req: any, res: any) {
  if (!isMethod(req, res, 'POST')) return;
  const env = requireEnv(res);
  if (!env) return;
  if (!env.productId) {
    res.status(500).json({ error: 'Payments are not configured (CREEM_PRODUCT_ID missing).' });
    return;
  }
  const email = typeof req.body?.email === 'string' ? req.body.email : undefined;
  const successUrl = process.env.CREEM_SUCCESS_URL || undefined;

  const { ok, status, data } = await creemPost(env.apiKey, '/checkouts', {
    product_id: env.productId,
    request_id: `vn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...(successUrl ? { success_url: successUrl } : {}),
    ...(email ? { customer: { email } } : {}),
  });
  if (!ok) {
    res.status(502).json({ error: 'Could not create a checkout session. Please try again.' });
    return;
  }
  const checkoutUrl = data?.checkout_url ?? data?.url ?? data?.checkoutUrl;
  if (!checkoutUrl) {
    res.status(502).json({ error: 'Checkout session had no URL. Please try again.' });
    return;
  }
  res.status(200).json({ checkout_url: checkoutUrl });
  void status;
}
