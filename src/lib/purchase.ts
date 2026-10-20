/**
 * Paid access + free-tier gating (client-side, localStorage).
 *
 * There are NO license keys. Paid access comes from two paths:
 *   - Account plan (primary): sign in (Firebase Auth) → /api/access
 *     returns the plan; purchases are linked via /api/claim. Works on
 *     any device. See src/lib/auth.tsx.
 *   - Guest device flag (fallback): returning from Creem checkout →
 *     /api/verify-purchase { checkout_id } sets a local flag so the new
 *     buyer can use the Studio immediately on this device, before (or
 *     without) signing in. "Restore purchase" by email does the same.
 *
 * Free tier: 10 conversions/day, localStorage counter (key
 * 'vectornest_free_daily', midnight reset), SHARED by the Studio and the
 * free converter pages. Free SVG downloads are CLEAN (no watermark).
 * Users with an active plan are never counted. This is honest-but-not-
 * paranoid gating: determined pirates are not the customer; friction
 * hurts conversion more. The old license-key storage (if present from
 * an earlier version) is cleaned up on load by migrateLegacyLicense().
 */

const PAID_KEY = 'vectornest_paid';
const PAID_EMAIL_KEY = 'vectornest_paid_email';
const FREE_COUNTER_KEY = 'vectornest_free_daily';

const LEGACY_LICENSE_KEY = 'vectornest_license';
const LEGACY_INSTANCE_KEY = 'vectornest_instance_id';

/** JSON-safe fetch: never throws "Unexpected token" on HTML error pages.
 *  Returns { ok, status, data } where data is parsed JSON or null. */
export async function fetchJson(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null }> {
  const res = await fetch(url, init);
  let data: Record<string, unknown> | null = null;
  try {
    const text = await res.text();
    data = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

const PAYMENTS_DOWN = 'Payments are temporarily unavailable — please try again or contact support.';
export const FREE_DAILY_LIMIT = 10;

interface FreeUsage {
  date: string; // YYYY-MM-DD (local)
  used: number;
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** One-time cleanup for browsers that still hold an old license key. */
export function migrateLegacyLicense(): void {
  try {
    localStorage.removeItem(LEGACY_LICENSE_KEY);
    localStorage.removeItem(LEGACY_INSTANCE_KEY);
  } catch {
    // Storage unavailable — nothing to clean.
  }
}

export function isPaid(): boolean {
  try {
    return localStorage.getItem(PAID_KEY) === '1';
  } catch {
    return false;
  }
}

/** The email used to restore paid access on this device, if any. */
export function getPaidEmail(): string | null {
  try {
    return localStorage.getItem(PAID_EMAIL_KEY);
  } catch {
    return null;
  }
}

export function setPaid(email?: string | null): void {
  try {
    localStorage.setItem(PAID_KEY, '1');
    if (email) localStorage.setItem(PAID_EMAIL_KEY, email);
  } catch {
    // Storage unavailable — paid state will not persist this session.
  }
}

export function clearPaid(): void {
  try {
    localStorage.removeItem(PAID_KEY);
    localStorage.removeItem(PAID_EMAIL_KEY);
  } catch {
    // ignore
  }
}

/** Verify a returned Creem checkout and unlock on this device if paid. */
export async function verifyPurchaseByCheckout(checkoutId: string): Promise<boolean> {
  const { data } = await fetchJson('/api/verify-purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checkout_id: checkoutId }),
  });
  if (data === null) throw new Error(PAYMENTS_DOWN);
  if ((data.paid as boolean | undefined) === true) {
    setPaid();
    return true;
  }
  return false;
}

/** Verify a purchase by checkout email and unlock on this device if paid. */
export async function verifyPurchaseByEmail(email: string): Promise<boolean> {
  const { data } = await fetchJson('/api/verify-purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  });
  if (data === null) throw new Error(PAYMENTS_DOWN);
  if ((data.error as string | undefined) && (data.paid as boolean | undefined) !== true) {
    throw new Error((data.error as string) || PAYMENTS_DOWN);
  }
  if ((data.paid as boolean | undefined) === true) {
    setPaid(email.trim().toLowerCase());
    return true;
  }
  return false;
}

// ---- Free tier: 10 conversions/day, shared counter, midnight reset ----

function readFreeUsage(): FreeUsage {
  try {
    const raw = localStorage.getItem(FREE_COUNTER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FreeUsage;
      if (parsed.date === todayLocal()) return parsed;
    }
  } catch {
    // fall through to a fresh counter
  }
  return { date: todayLocal(), used: 0 };
}

export function freeRemaining(): number {
  if (isPaid()) return Infinity;
  return Math.max(0, FREE_DAILY_LIMIT - readFreeUsage().used);
}

/** Consume one free conversion. Paid users are never counted. */
export function consumeFreeConversion(): void {
  if (isPaid()) return;
  const usage = readFreeUsage();
  usage.used += 1;
  try {
    localStorage.setItem(FREE_COUNTER_KEY, JSON.stringify(usage));
  } catch {
    // ignore
  }
}
