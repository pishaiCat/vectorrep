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
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

let db = null;
let initError = null;
// Safe diagnostic only: which init stage failed ('parse' | 'credential' | 'ok').
// Never contains secret material — safe to surface in a JSON error response.
let initStage = 'not_started';

export function firebaseInitStage() {
  return initStage;
}

function tryParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseServiceAccount() {
  let raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  if (!raw) return null;
  // Tolerate the value being pasted with surrounding quotes.
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1);
  }
  let parsed = tryParseJson(raw);
  // Tolerate double-encoded JSON (a JSON string containing JSON).
  if (typeof parsed === 'string') parsed = tryParseJson(parsed);
  if (!parsed) {
    // Tolerate a paste that turned the private_key's \n escapes into real
    // line breaks inside the string (invalid JSON): re-escape newlines and
    // tabs inside the private_key value, then parse again.
    const repaired = raw.replace(
      /("private_key"\s*:\s*")([\s\S]*?)("\s*[,}])/,
      (_m, p1, p2, p3) => p1 + p2.replace(/\r\n?|\n/g, '\\n').replace(/\t/g, '\\t') + p3,
    );
    parsed = tryParseJson(repaired);
  }
  if (!parsed || typeof parsed !== 'object' || typeof parsed.private_key !== 'string') return null;
  // Repair a private_key whose PEM newlines were lost in the paste
  // (single-line body): re-wrap the base64 body at 64 chars.
  const key = parsed.private_key;
  if (key.includes('BEGIN PRIVATE KEY') && !key.includes('\n')) {
    const body = key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
    if (/^[A-Za-z0-9+/=]+$/.test(body)) {
      parsed.private_key = `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----\n`;
    }
  }
  return parsed;
}

export function isFirebaseConfigured() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
}

/** Firestore server-timestamp sentinel for createdAt/updatedAt. */
export function serverTimestamp() {
  return FieldValue.serverTimestamp();
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
      initStage = 'parse';
      throw new Error('Firebase is not configured (FIREBASE_SERVICE_ACCOUNT missing or invalid).');
    }
    const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id;
    if (!projectId) {
      initStage = 'parse';
      throw new Error('Firebase is not configured (FIREBASE_PROJECT_ID missing).');
    }
    // firebase-admin keeps a global app registry; reuse it across warm
    // invocations instead of re-initializing.
    if (getApps().length === 0) {
      try {
        initializeApp({
          credential: cert(serviceAccount),
          projectId,
        });
      } catch {
        initStage = 'credential';
        throw new Error('Firebase credential rejected (service-account key invalid).');
      }
    }
    db = getFirestore();
    initStage = 'ok';
    return db;
  } catch (e) {
    if (initStage === 'not_started') initStage = 'credential';
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
