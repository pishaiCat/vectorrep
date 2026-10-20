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
import { isMethod } from './_creem.js';
import { getDb, getAuthUser, serverTimestamp } from './_firebase.js';

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
