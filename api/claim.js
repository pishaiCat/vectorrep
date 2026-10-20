/**
 * POST /api/claim — Authorization: Bearer <Firebase ID token>
 *   -> { plan: 'lifetime' | 'pass3' | 'free', active: boolean,
 *        expiresAt: ISO string | null }
 *
 * Links the signed-in user's purchases to their account. Looks up
 * `purchases` by the email ON THE VERIFIED ID TOKEN (never a
 * client-supplied email) with status == 'paid' — so refunded purchases
 * don't count. Plan derivation:
 *   - any purchase with plan 'lifetime' (or no plan field — pre-plan
 *     purchases were all the $79 lifetime product) → lifetime
 *   - else the pass3 purchase with the latest planExpiresAtIso:
 *     pass3, active while that expiry is in the future
 * Upserts users/{uid} { email, plan, planExpiresAt, updatedAt }.
 * Always returns JSON.
 */
import { isMethod, requireEnv, creemGet } from './_creem.js';
import { getDb, getAuthUser, serverTimestamp, purchaseRecord } from './_firebase.js';

const PAID_STATUSES = new Set(['completed', 'paid', 'success', 'succeeded', 'active']);

function pickStr(...values) {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function isPaidStatus(status) {
  return typeof status === 'string' && PAID_STATUSES.has(status.toLowerCase());
}

/** Plan for a product id: pass product -> pass3 (+72h from purchase time),
 *  anything else we sell -> lifetime. Returns null for foreign products. */
function planForProduct(productId, purchasedAtIso) {
  const passId = process.env.CREEM_PRODUCT_ID_PASS3 || '';
  const lifeId = process.env.CREEM_PRODUCT_ID || '';
  if (passId && productId === passId) {
    const start = purchasedAtIso ? Date.parse(purchasedAtIso) : Date.now();
    return { plan: 'pass3', expiresAt: new Date(start + 72 * 3600 * 1000).toISOString() };
  }
  if (lifeId && productId === lifeId) return { plan: 'lifetime', expiresAt: null };
  if (!productId) return { plan: 'lifetime', expiresAt: null };
  return null;
}

/** Derive { plan, expiresAt } from one purchase record's fields. */
function planFromRecord(data) {
  if (data.plan === 'pass3') {
    return { plan: 'pass3', expiresAt: typeof data.planExpiresAtIso === 'string' ? data.planExpiresAtIso : null };
  }
  return { plan: 'lifetime', expiresAt: null };
}

export default async function handler(req, res) {
  try {
    if (!isMethod(req, res, 'POST')) return;
    const user = await getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Sign-in required or token invalid.' });
      return;
    }
    const email = typeof user.email === 'string' ? user.email.toLowerCase().trim() : '';
    if (!email) {
      res.status(400).json({ error: 'Your sign-in has no email address to match purchases against.' });
      return;
    }
    const db = getDb();

    // ---- Claim by checkout_id (the purchase just made, from the return
    // URL). Works even when the checkout email differs from the account
    // email: possession of the checkout id is the proof, same trust level
    // as /api/verify-purchase's device unlock. ----
    let body = {};
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch {
      body = {};
    }
    const checkoutId = pickStr(body.checkout_id, body.checkoutId);
    if (checkoutId) {
      let byCheckout = null;
      const ref = db.collection('purchases').doc(checkoutId);
      const snap = await ref.get();
      if (snap.exists && snap.data()?.status === 'paid') {
        byCheckout = planFromRecord(snap.data() || {});
      } else if (!snap.exists) {
        // Webhook may lag: confirm directly against Creem and cache the
        // record (same pattern as /api/verify-purchase).
        const env = requireEnv(res);
        if (!env) return;
        const { ok, data } = await creemGet(env.apiKey, `/checkouts?checkout_id=${encodeURIComponent(checkoutId)}`);
        const checkout = ok && data && typeof data === 'object' ? (data.checkout ?? data) : null;
        const order = checkout && typeof checkout.order === 'object' ? checkout.order : null;
        if (checkout && (isPaidStatus(checkout.status) || (order && isPaidStatus(order.status)))) {
          const product = typeof checkout.product === 'object' ? checkout.product : null;
          const productId = pickStr(product?.id, checkout.product_id, order?.product_id);
          const mapped = planForProduct(productId, null);
          if (mapped) {
            const customer = typeof checkout.customer === 'object' ? checkout.customer : null;
            await ref.set({
              ...purchaseRecord({
                email: pickStr(customer?.email, checkout.customer_email),
                status: 'paid',
                product_id: productId,
                checkout_id: checkoutId,
                order_id: pickStr(order?.id, checkout.order_id),
                source: 'claim',
                plan: mapped.plan,
                planExpiresAtIso: mapped.expiresAt,
              }),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            byCheckout = mapped;
          }
        }
      }
      if (byCheckout) {
        const active = byCheckout.plan === 'lifetime'
          || (byCheckout.expiresAt ? Date.now() < Date.parse(byCheckout.expiresAt) : false);
        await db.collection('users').doc(user.uid).set({
          email,
          plan: byCheckout.plan,
          planExpiresAt: byCheckout.plan === 'pass3' ? byCheckout.expiresAt : null,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        res.status(200).json({ plan: byCheckout.plan, active, expiresAt: byCheckout.plan === 'pass3' ? byCheckout.expiresAt : null });
        return;
      }
      // checkout_id did not resolve to a paid purchase: fall through to
      // the email lookup below before giving up.
    }

    const snap = await db.collection('purchases')
      .where('email', '==', email)
      .where('status', '==', 'paid')
      .get();

    let plan = 'free';
    let expiresAt = null;
    let latestPassExpiry = null;
    snap.forEach((doc) => {
      const data = doc.data() || {};
      if (data.plan === 'pass3') {
        if (typeof data.planExpiresAtIso === 'string') {
          if (!latestPassExpiry || data.planExpiresAtIso > latestPassExpiry) {
            latestPassExpiry = data.planExpiresAtIso;
          }
        }
      } else {
        // 'lifetime' or missing (older purchases predate the plan field
        // and were all the $79 lifetime product).
        plan = 'lifetime';
      }
    });
    if (plan !== 'lifetime' && latestPassExpiry) {
      plan = 'pass3';
      expiresAt = latestPassExpiry;
    }
    const active = plan === 'lifetime' || (plan === 'pass3' && expiresAt ? Date.now() < Date.parse(expiresAt) : false);

    await db.collection('users').doc(user.uid).set({
      email,
      plan,
      planExpiresAt: plan === 'pass3' ? expiresAt : null,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    res.status(200).json({ plan, active, expiresAt: plan === 'pass3' ? expiresAt : null });
  } catch {
    try {
      res.status(500).json({ error: 'Claim temporarily unavailable. Please try again.' });
    } catch {
      // Response already sent.
    }
  }
}
