/**
 * POST /api/webhook — Creem webhook endpoint.
 *
 * Handles:
 *   checkout.completed → writes a `purchases` record to Firestore (idempotent)
 *   refund.created     → marks the matching purchase `refunded`
 *   everything else    → ignored with HTTP 200
 *
 * Verification (Creem docs: https://docs.creem.io/code/webhooks):
 *   Every request carries a `creem-signature` header: HMAC-SHA256 of the
 *   RAW request payload, keyed with the webhook secret (CREEM_WEBHOOK_SECRET,
 *   found on the Creem dashboard Developers > Webhook page).
 *   - If the secret is set AND the raw body is available: a bad signature
 *     is rejected with 401 and nothing is written.
 *   - If the raw body is unavailable (platform pre-parsed the JSON body),
 *     the event is instead verified server-side by fetching the checkout
 *     from Creem's API (GET /v1/checkouts?checkout_id=…) and confirming it
 *     is paid before anything is written. A record is NEVER written on an
 *     unverified event.
 *   - refund.created has no equivalent Creem lookup, so an unverifiable
 *     refund is ignored (fail closed — a spoofed refund must never revoke
 *     a real purchase).
 *
 * Creem retries failed deliveries (5 attempts over ~24h), so the handler is
 * idempotent: a re-delivered checkout.completed returns 200 without
 * duplicating or overwriting the original record. Genuine handler errors
 * return 500 JSON so Creem retries; unknown events return 200.
 *
 * Always returns JSON, never HTML.
 */
import crypto from 'node:crypto';
import { isMethod } from './_creem.js';
import { getDb, purchaseRecord, serverTimestamp } from './_firebase.js';
import { requireEnv, creemGet } from './_creem.js';

const PAID_STATUSES = new Set(['completed', 'paid', 'success', 'succeeded', 'active']);

/** First non-empty string among the candidates. */
function pick(...values) {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

/** First finite number among the candidates. */
function pickNumber(...values) {
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

/**
 * Raw request body. Vercel may hand us a pre-parsed object (raw bytes lost)
 * or an unread stream. Returns { raw: Buffer | null, parsed: object | null }.
 */
async function readBody(req) {
  const body = req.body;
  if (typeof body === 'string') {
    try {
      return { raw: Buffer.from(body, 'utf8'), parsed: body ? JSON.parse(body) : {} };
    } catch {
      return { raw: Buffer.from(body, 'utf8'), parsed: null };
    }
  }
  if (Buffer.isBuffer(body)) {
    try {
      return { raw: body, parsed: JSON.parse(body.toString('utf8')) };
    } catch {
      return { raw: body, parsed: null };
    }
  }
  if (body && typeof body === 'object') {
    return { raw: null, parsed: body }; // pre-parsed: raw bytes unavailable
  }
  // Unread stream — collect it.
  if (req && typeof req.on === 'function' && !req.readableEnded) {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const raw = Buffer.concat(chunks);
      try {
        return { raw, parsed: raw.length ? JSON.parse(raw.toString('utf8')) : {} };
      } catch {
        return { raw, parsed: null };
      }
    } catch {
      return { raw: null, parsed: null };
    }
  }
  return { raw: null, parsed: null };
}

function verifySignature(raw, signature, secret) {
  if (!raw || !signature || !secret) return false;
  try {
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Extract the fields we need from a checkout.completed `object`, tolerating
 *  several payload shapes (customer/order may be ids or expanded objects). */
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
    productId: pick(
      product?.id, obj?.product_id, obj?.productId, order?.product_id, order?.productId,
    ),
    amount: pickNumber(order?.amount, order?.total, order?.amount_paid, obj?.amount, obj?.total),
    currency: pick(order?.currency, obj?.currency),
    status: pick(obj?.status, order?.status),
  };
}

function isPaidStatus(status) {
  return typeof status === 'string' && PAID_STATUSES.has(status.toLowerCase());
}

/** Server-side confirmation: fetch the checkout from Creem and confirm paid. */
async function confirmPaidViaCreem(apiKey, checkoutId) {
  const { ok, data } = await creemGet(apiKey, `/checkouts?checkout_id=${encodeURIComponent(checkoutId)}`);
  if (!ok || !data || typeof data !== 'object') return null;
  const checkout = data.checkout ?? data;
  const order = checkout && typeof checkout.order === 'object' ? checkout.order : null;
  const paid = isPaidStatus(checkout.status) || (order && isPaidStatus(order.status));
  if (!paid) return null;
  return extractCheckout(checkout);
}

export default async function handler(req, res) {
  try {
    if (!isMethod(req, res, 'POST')) return;

    const { raw, parsed } = await readBody(req);
    if (!parsed || typeof parsed !== 'object') {
      res.status(400).json({ error: 'Invalid webhook payload.' });
      return;
    }
    const eventType = pick(parsed.eventType, parsed.type, parsed.event_type);
    const obj = parsed.object ?? parsed.data?.object ?? parsed.data ?? null;

    // Unknown / unhandled event types: acknowledge, do nothing.
    if (eventType !== 'checkout.completed' && eventType !== 'refund.created') {
      res.status(200).json({ ignored: true, event: eventType });
      return;
    }
    if (!obj || typeof obj !== 'object') {
      res.status(200).json({ ignored: true, reason: 'Missing event object.' });
      return;
    }

    // ---- Verification ----
    const secret = process.env.CREEM_WEBHOOK_SECRET || '';
    const signature = req.headers?.['creem-signature'] || req.headers?.['creem_signature'] || '';
    const signatureValid = secret && raw ? verifySignature(raw, signature, secret) : false;
    if (secret && raw && !signatureValid) {
      res.status(401).json({ error: 'Invalid webhook signature.' });
      return;
    }

    const env = requireEnv(res);
    if (!env) return; // requireEnv already sent the JSON error

    // ---- checkout.completed ----
    if (eventType === 'checkout.completed') {
      let fields = extractCheckout(obj);
      if (!signatureValid) {
        // No usable signature (raw body unavailable, or no secret set):
        // confirm against Creem's API before trusting anything.
        if (!fields.checkoutId) {
          res.status(200).json({ ignored: true, reason: 'No checkout id to verify.' });
          return;
        }
        const confirmed = await confirmPaidViaCreem(env.apiKey, fields.checkoutId);
        if (!confirmed) {
          res.status(200).json({ ignored: true, reason: 'Checkout not confirmed paid via Creem API.' });
          return;
        }
        fields = confirmed;
      } else if (!isPaidStatus(fields.status) && fields.checkoutId) {
        // Signature valid but payload status unclear: confirm via API too.
        const confirmed = await confirmPaidViaCreem(env.apiKey, fields.checkoutId);
        if (confirmed) fields = confirmed;
      }
      // Map the product to a plan. Ignore checkouts for an unrelated
      // product (e.g. a different product added to the same Creem store).
      const pass3ProductId = process.env.CREEM_PRODUCT_ID_PASS3 || '';
      let purchasePlan = 'lifetime';
      if (fields.productId) {
        if (pass3ProductId && fields.productId === pass3ProductId) {
          purchasePlan = 'pass3';
        } else if (env.productId && fields.productId === env.productId) {
          purchasePlan = 'lifetime';
        } else if (env.productId || pass3ProductId) {
          res.status(200).json({ ignored: true, reason: 'Different product.' });
          return;
        }
      }
      const docId = fields.checkoutId || fields.orderId;
      if (!docId) {
        res.status(200).json({ ignored: true, reason: 'No checkout/order id.' });
        return;
      }
      const db = getDb();
      const ref = db.collection('purchases').doc(docId);
      const existing = await ref.get();
      if (existing.exists && existing.data()?.status === 'paid') {
        res.status(200).json({ ok: true, duplicate: true });
        return;
      }
      await ref.set({
        ...purchaseRecord({
          ...fields,
          status: 'paid',
          source: 'webhook',
          plan: purchasePlan,
          // 3-day pass: access ends 72h after purchase (write time ≈
          // purchase time; createdAt below is a server timestamp).
          planExpiresAtIso: purchasePlan === 'pass3'
            ? new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
            : null,
        }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      res.status(200).json({ ok: true });
      return;
    }

    // ---- refund.created (fail closed: signature required) ----
    if (!signatureValid) {
      res.status(200).json({ ignored: true, reason: 'Refund without verifiable signature ignored.' });
      return;
    }
    const refundObj = obj;
    const refundCheckoutId = pick(
      refundObj?.checkout_id, refundObj?.checkoutId,
      refundObj?.order?.checkout_id, refundObj?.checkout?.id,
    );
    const refundOrderId = pick(
      refundObj?.order_id, refundObj?.orderId,
      refundObj?.order?.id, refundObj?.checkout?.order_id,
    );
    const refundEmail = pick(
      refundObj?.customer?.email, refundObj?.order?.customer?.email,
      refundObj?.customer_email, refundObj?.email,
    );
    const db = getDb();
    let ref = null;
    if (refundCheckoutId) {
      const snap = await db.collection('purchases').doc(refundCheckoutId).get();
      if (snap.exists) ref = snap.ref;
    }
    if (!ref && refundOrderId) {
      const snap = await db.collection('purchases').where('order_id', '==', refundOrderId).limit(1).get();
      if (!snap.empty) ref = snap.docs[0].ref;
    }
    if (!ref && refundEmail) {
      const snap = await db.collection('purchases')
        .where('email', '==', refundEmail.toLowerCase().trim())
        .where('status', '==', 'paid')
        .limit(1).get();
      if (!snap.empty) ref = snap.docs[0].ref;
    }
    if (!ref) {
      res.status(200).json({ ignored: true, reason: 'No matching purchase for refund.' });
      return;
    }
    await ref.set({ status: 'refunded', updatedAt: serverTimestamp() }, { merge: true });
    res.status(200).json({ ok: true, refunded: true });
  } catch (e) {
    // Genuine failure (e.g. Firestore down): 500 so Creem retries delivery.
    try {
      res.status(500).json({ error: 'Webhook handler temporarily unavailable.' });
    } catch {
      // Response already sent.
    }
    void e;
  }
}
