/**
 * POST /api/verify-purchase { checkout_id?, order_id?, email? }
 *   -> { paid: true } | { paid: false } (+ generic error on bad input)
 *
 * Auto-verify for the no-key purchase flow:
 *   - checkout_id: look up Firestore purchases/{checkout_id}. If missing,
 *     fall back to verifying directly against Creem's API server-side
 *     (GET /v1/checkouts?checkout_id=…); if Creem confirms paid, write the
 *     Firestore record so the next check is fast.
 *   - order_id: look up Firestore purchases by order_id (webhook-written).
 *   - email: look up Firestore purchases with that (lowercased) email and
 *     status paid. Returns ONLY paid true/false — never lists purchases,
 *     never leaks other customers' data.
 *
 * Always returns JSON. A refunded purchase returns paid: false.
 */
import { isMethod, requireEnv, creemGet } from './_creem.js';
import { getDb, purchaseRecord, serverTimestamp, isFirebaseConfigured, firebaseInitStage } from './_firebase.js';

const PAID_STATUSES = new Set(['completed', 'paid', 'success', 'succeeded', 'active']);

function pick(...values) {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function pickNumber(...values) {
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

function extractCheckout(obj) {
  const order = obj && typeof obj.order === 'object' ? obj.order : null;
  const customer = obj && typeof obj.customer === 'object' ? obj.customer : null;
  const orderCustomer = order && typeof order.customer === 'object' ? order.customer : null;
  const product = obj && typeof obj.product === 'object' ? obj.product : null;
  return {
    checkoutId: pick(obj?.id, obj?.checkout_id, obj?.checkoutId),
    orderId: pick(order?.id, obj?.order_id, obj?.orderId),
    email: pick(
      customer?.email, orderCustomer?.email, obj?.customer_email, obj?.customerEmail,
      obj?.email, order?.customer_email, order?.email, obj?.metadata?.email,
    ),
    productId: pick(product?.id, obj?.product_id, obj?.productId, order?.product_id, order?.productId),
    amount: pickNumber(order?.amount, order?.total, order?.amount_paid, obj?.amount, obj?.total),
    currency: pick(order?.currency, obj?.currency),
    status: pick(obj?.status, order?.status),
  };
}

function isPaidStatus(status) {
  return typeof status === 'string' && PAID_STATUSES.has(status.toLowerCase());
}

export default async function handler(req, res) {
  try {
    if (!isMethod(req, res, 'POST')) return;
    const env = requireEnv(res);
    if (!env) return;

    let body = {};
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch {
      body = {};
    }
    const checkoutId = pick(body.checkout_id, body.checkoutId);
    const orderId = pick(body.order_id, body.orderId);
    const emailRaw = pick(body.email);
    const email = emailRaw ? emailRaw.toLowerCase().trim() : null;

    if (!checkoutId && !orderId && !email) {
      res.status(400).json({ error: 'A checkout id, order id, or email is required.' });
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }

    // ---- Firestore lookups (when configured) ----
    if (isFirebaseConfigured()) {
      try {
        const db = getDb();
        if (checkoutId) {
          const snap = await db.collection('purchases').doc(checkoutId).get();
          if (snap.exists) {
            res.status(200).json({ paid: snap.data()?.status === 'paid' });
            return;
          }
        }
        if (orderId) {
          const snap = await db.collection('purchases').where('order_id', '==', orderId).limit(1).get();
          if (!snap.empty) {
            res.status(200).json({ paid: snap.docs[0].data()?.status === 'paid' });
            return;
          }
        }
        if (email) {
          const snap = await db.collection('purchases')
            .where('email', '==', email)
            .where('status', '==', 'paid')
            .limit(1).get();
          if (!snap.empty) {
            res.status(200).json({ paid: true });
            return;
          }
          // Email given but no paid record: fall through to the
          // checkout_id Creem check below if a checkout id was also sent.
          if (!checkoutId) {
            res.status(200).json({ paid: false });
            return;
          }
        }
      } catch {
        // Firestore unavailable: fall through to the Creem check for
        // checkout_id; for email-only lookups we cannot verify.
        if (!checkoutId) {
          res.status(200).json({ paid: false, error: 'Purchase records are temporarily unavailable. Please try again.', stage: firebaseInitStage() });
          return;
        }
      }
    }

    // ---- Creem fallback (checkout_id only): authoritative server-side check ----
    if (checkoutId) {
      const { ok, data } = await creemGet(env.apiKey, `/checkouts?checkout_id=${encodeURIComponent(checkoutId)}`);
      if (!ok || !data || typeof data !== 'object') {
        res.status(200).json({ paid: false });
        return;
      }
      const checkout = data.checkout ?? data;
      const order = checkout && typeof checkout.order === 'object' ? checkout.order : null;
      const paid = isPaidStatus(checkout.status) || (order && isPaidStatus(order.status));
      if (!paid) {
        res.status(200).json({ paid: false });
        return;
      }
      const fields = extractCheckout(checkout);
      // Only trust it for one of OUR products when Creem tells us the
      // product (lifetime OR the 3-day pass).
      const passProductId = process.env.CREEM_PRODUCT_ID_PASS3 || '';
      const isOurs = !fields.productId
        || (env.productId && fields.productId === env.productId)
        || (passProductId && fields.productId === passProductId);
      if (!isOurs) {
        res.status(200).json({ paid: false });
        return;
      }
      // Cache the confirmed purchase so the next check is a fast Firestore
      // hit — WITH its plan, so a later claim derives the right access
      // (a pass cached without a plan would read as lifetime).
      if (isFirebaseConfigured()) {
        try {
          const db = getDb();
          const ref = db.collection('purchases').doc(checkoutId);
          const existing = await ref.get();
          if (!existing.exists) {
            const isPass = Boolean(passProductId && fields.productId === passProductId);
            await ref.set({
              ...purchaseRecord({
                ...fields,
                status: 'paid',
                source: 'verify-purchase',
                plan: isPass ? 'pass3' : 'lifetime',
                planExpiresAtIso: isPass ? new Date(Date.now() + 72 * 3600 * 1000).toISOString() : null,
              }),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch {
          // Cache write failure must not block the paid result.
        }
      }
      res.status(200).json({ paid: true });
      return;
    }

    // Email-only and Firestore unconfigured/unavailable: cannot verify.
    res.status(200).json({ paid: false });
  } catch {
    try {
      res.status(500).json({ error: 'Verification temporarily unavailable. Please try again.' });
    } catch {
      // Response already sent.
    }
  }
}
