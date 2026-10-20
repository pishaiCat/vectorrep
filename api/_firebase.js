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

/**
 * Firebase ID-token verification WITHOUT firebase-admin/auth.
 *
 * Why: the 'firebase-admin/auth' subpath is unusable in these Vercel
 * functions — a static import crashes module load outright
 * (FUNCTION_INVOCATION_FAILED, confirmed by bisect), and with a lazy
 * dynamic import verifyIdToken still rejected freshly minted valid
 * tokens live on 2026-10-20 (exact failing step not isolated). So
 * tokens are verified manually,
 * exactly as the Admin SDK does it: RS256 signature against Google's
 * public x509 certs for the securetoken system account, plus claim
 * checks (aud, iss, exp, iat, sub). Uses only node:crypto + fetch.
 */
import crypto from 'node:crypto';

const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let certCache = { certs: null, expiresAt: 0 };

function firebaseProjectId() {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  const sa = parseServiceAccount();
  return sa && typeof sa.project_id === 'string' ? sa.project_id : null;
}

async function googleCerts() {
  if (certCache.certs && Date.now() < certCache.expiresAt) return certCache.certs;
  const res = await fetch(CERTS_URL);
  if (!res.ok) throw new Error('Could not fetch Google token certs.');
  const certs = await res.json();
  const cc = res.headers.get('cache-control') || '';
  const m = cc.match(/max-age=(\d+)/);
  const ttlMs = m ? Number(m[1]) * 1000 : 3600_000;
  certCache = { certs, expiresAt: Date.now() + Math.min(ttlMs, 3600_000) };
  return certs;
}

function b64urlJson(part) {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

/** Verify a Firebase ID token. Returns { uid, email } or null. */
export async function verifyFirebaseIdToken(token) {
  try {
    const projectId = firebaseProjectId();
    if (!projectId || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const header = b64urlJson(parts[0]);
    const payload = b64urlJson(parts[1]);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null;
    const certs = await googleCerts();
    const pem = certs[header.kid];
    if (!pem) return null;
    const publicKey = new crypto.X509Certificate(pem).publicKey;
    const signed = Buffer.from(`${parts[0]}.${parts[1]}`, 'utf8');
    const signature = Buffer.from(parts[2], 'base64url');
    if (!crypto.verify('RSA-SHA256', signed, publicKey, signature)) return null;
    const now = Math.floor(Date.now() / 1000);
    if (payload.aud !== projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
    if (typeof payload.iat !== 'number' || payload.iat > now + 300) return null;
    if (typeof payload.sub !== 'string' || !payload.sub) return null;
    return {
      uid: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
    };
  } catch {
    return null;
  }
}

/**
 * Verify a Firebase ID token from an `Authorization: Bearer <token>`
 * header. Returns { uid, email } or null when the header is
 * missing/malformed or the token is invalid.
 */
export async function getAuthUser(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  return verifyFirebaseIdToken(token);
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
  plan = null,
  planExpiresAtIso = null,
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
    // 'lifetime' | 'pass3' — mapped from the Creem product id by the webhook.
    plan: plan === 'pass3' || plan === 'lifetime' ? plan : null,
    // For pass3: ISO string of purchase time + 72h (null for lifetime).
    planExpiresAtIso: typeof planExpiresAtIso === 'string' ? planExpiresAtIso : null,
  };
}
