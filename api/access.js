/**
 * POST /api/access — Authorization: Bearer <Firebase ID token>
 *   -> { plan: 'lifetime' | 'pass3' | 'free', active: boolean,
 *        expiresAt: ISO string | null, email }
 *
 * Reads the signed-in user's plan record (users/{uid}, written by
 * /api/claim). For pass3, active = now < expiresAt. No record → free.
 * 401 on a missing/invalid token. Always returns JSON.
 */
import { isMethod } from './_creem.js';
import { getDb, getAuthUser } from './_firebase.js';

export default async function handler(req, res) {
  try {
    if (!isMethod(req, res, 'POST')) return;
    const user = await getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Sign-in required or token invalid.' });
      return;
    }
    const email = typeof user.email === 'string' ? user.email.toLowerCase() : null;
    const snap = await getDb().collection('users').doc(user.uid).get();
    if (!snap.exists) {
      res.status(200).json({ plan: 'free', active: false, expiresAt: null, email });
      return;
    }
    const data = snap.data() || {};
    if (data.plan === 'lifetime') {
      res.status(200).json({ plan: 'lifetime', active: true, expiresAt: null, email });
      return;
    }
    if (data.plan === 'pass3') {
      const expiresAt = typeof data.planExpiresAt === 'string' ? data.planExpiresAt : null;
      const active = expiresAt ? Date.now() < Date.parse(expiresAt) : false;
      res.status(200).json({ plan: 'pass3', active, expiresAt, email });
      return;
    }
    res.status(200).json({ plan: 'free', active: false, expiresAt: null, email });
  } catch {
    try {
      res.status(500).json({ error: 'Access check temporarily unavailable. Please try again.' });
    } catch {
      // Response already sent.
    }
  }
}
