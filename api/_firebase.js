/**
 * Firebase Admin helper for the Vercel serverless functions (plain JS, ESM).
 *
 * Initializes firebase-admin lazily (singleton) from env vars only:
 *   FIREBASE_SERVICE_ACCOUNT — the full service-account JSON, as a string
 *   FIREBASE_PROJECT_ID      — the Firebase project id (fallback: the
 *                              project_id inside the service-account JSON)
 *
 * No key or secret is ever committed or echoed. If the env vars are missing
 * or malformed, getDb() throws a clear Error — callers must catch it and
 * return JSON (never HTML, never a stack trace).
 */
import admin from 'firebase-admin';

let db = null;
let initError = null;

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || '';
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.private_key !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isFirebaseConfigured() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
}

/** Firestore server-timestamp sentinel for createdAt/updatedAt. */
export function serverTimestamp() {
  return admin.firestore.FieldValue.serverTimestamp();
}

/**
 * Returns the Firestore instance. Throws if Firebase is not configured.
 * The thrown Error's message is safe to surface as a generic JSON error.
 */
export function getDb() {
  if (db) return db;
  if (initError) throw initError;
  try {
    const serviceAccount = parseServiceAccount();
    if (!serviceAccount) {
      throw new Error('Firebase is not configured (FIREBASE_SERVICE_ACCOUNT missing or invalid).');
    }
    const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id;
    if (!projectId) {
      throw new Error('Firebase is not configured (FIREBASE_PROJECT_ID missing).');
    }
    // firebase-admin keeps a global app registry; reuse it across warm
    // invocations instead of re-initializing.
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
    }
    db = admin.firestore();
    return db;
  } catch (e) {
    initError = e instanceof Error ? e : new Error('Firebase failed to initialize.');
    throw initError;
  }
}

/** Shape of a purchases/{id} document. Kept here so webhook + verify agree. */
export function purchaseRecord({
  email = null,
  status = 'paid',
  product_id = null,
  amount = null,
  currency = null,
  checkout_id = null,
  order_id = null,
  source = 'webhook',
}) {
  return {
    email: typeof email === 'string' && email.includes('@') ? email.toLowerCase().trim() : null,
    status,
    product_id: typeof product_id === 'string' ? product_id : null,
    amount: typeof amount === 'number' ? amount : null,
    currency: typeof currency === 'string' ? currency : null,
    checkout_id: typeof checkout_id === 'string' ? checkout_id : null,
    order_id: typeof order_id === 'string' ? order_id : null,
    source,
  };
}
