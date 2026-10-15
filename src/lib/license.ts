/**
 * Licensing + free-tier gating (client-side, localStorage).
 *
 * Paid state is a local flag re-validated against the server every 7 days
 * via /api/verify-license. If the server says the key is revoked/expired,
 * the app gracefully downgrades to the free tier with a notice — no hard
 * lockout, no data loss. This is honest-but-not-paranoid gating: determined
 * pirates are not the customer; friction hurts conversion more.
 *
 * The license KEY itself is stored locally (needed for re-validation) and is
 * only ever sent to our own /api/* endpoints — never to third parties, and
 * never in a URL.
 */

export interface StoredLicense {
  key: string;
  instanceId: string;
  /** ISO timestamp of the next required server re-validation. */
  validUntil: string;
}

const LICENSE_KEY = 'vectornest_license';
const INSTANCE_KEY = 'vectornest_instance_id';
const FREE_COUNTER_KEY = 'vectornest_free_usage';

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
export const FREE_DAILY_LIMIT = 3;
export const REVALIDATE_DAYS = 7;

interface FreeUsage {
  date: string; // YYYY-MM-DD (local)
  used: number;
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readLicense(): StoredLicense | null {
  try {
    const raw = localStorage.getItem(LICENSE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLicense;
    if (typeof parsed.key !== 'string' || typeof parsed.instanceId !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getStoredLicense(): StoredLicense | null {
  return readLicense();
}

export function saveLicense(key: string, instanceId: string): StoredLicense {
  const validUntil = new Date(Date.now() + REVALIDATE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const stored: StoredLicense = { key, instanceId, validUntil };
  localStorage.setItem(LICENSE_KEY, JSON.stringify(stored));
  return stored;
}

export function clearLicense(): void {
  localStorage.removeItem(LICENSE_KEY);
}

export function isPaid(): boolean {
  const lic = readLicense();
  return !!lic && new Date(lic.validUntil).getTime() > Date.now();
}

/** True when a paid license exists but its 7-day window has passed. */
export function needsRevalidation(): boolean {
  const lic = readLicense();
  return !!lic && new Date(lic.validUntil).getTime() <= Date.now();
}

/** Stable per-device id, created once and reused for license activations. */
export function getOrCreateInstanceId(): string {
  let id = localStorage.getItem(INSTANCE_KEY);
  if (!id) {
    id = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `vn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(INSTANCE_KEY, id);
  }
  return id;
}

/** Re-validate a stored license against the server. Returns true when the
 *  license is still valid. On revoke/expired the local license is cleared
 *  (graceful downgrade); on network failure the local flag is kept so a
 *  temporary outage never locks a paying customer out. */
export async function revalidateLicense(): Promise<boolean> {
  const lic = readLicense();
  if (!lic) return false;
  try {
    const { ok, data } = await fetchJson('/api/verify-license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: lic.key, instance_id: lic.instanceId }),
    });
    const valid = (data?.valid as boolean | undefined) ?? false;
    if (ok && valid) {
      saveLicense(lic.key, (data?.instance_id as string | undefined) ?? lic.instanceId);
      return true;
    }
    if (data === null) return true; // non-JSON / server-down: keep local paid state
    clearLicense();
    return false;
  } catch {
    return true; // network failure: keep local paid state, retry next load
  }
}

/** Activate a pasted key. Returns the stored license on success. */
export async function activateLicense(key: string): Promise<StoredLicense> {
  const trimmed = key.trim();
  if (!trimmed) throw new Error('Paste your license key first.');
  const instanceId = getOrCreateInstanceId();
  const { ok, data } = await fetchJson('/api/verify-license', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: trimmed, instance_name: `VectorNest — ${navigator.userAgent.includes('Mac') ? 'Mac' : 'Device'} ${instanceId.slice(0, 8)}` }),
  });
  if (data === null) throw new Error(PAYMENTS_DOWN);
  const valid = (data.valid as boolean | undefined) ?? false;
  if (!ok || !valid) {
    throw new Error((data.error as string | undefined) ?? 'That key could not be verified. Check it and try again.');
  }
  return saveLicense(trimmed, (data.instance_id as string | undefined) ?? instanceId);
}

/** Deactivate this device server-side and clear the local license. */
export async function deactivateLicense(): Promise<void> {
  const lic = readLicense();
  if (lic) {
    try {
      await fetch('/api/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: lic.key, instance_id: lic.instanceId }),
      });
    } catch {
      // Server unreachable: still clear locally; the seat frees on re-validation.
    }
  }
  clearLicense();
}

// ---- Free tier: 3 conversions/day, localStorage counter, midnight reset ----

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
  localStorage.setItem(FREE_COUNTER_KEY, JSON.stringify(usage));
}
