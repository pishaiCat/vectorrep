/**
 * Shared Creem helpers for the Vercel serverless functions (plain JS, ESM).
 * The Creem API key NEVER leaves the server — it is read from
 * `CREEM_API_KEY` and sent only in the `x-api-key` header to Creem.
 * Keys are never echoed in responses or error messages.
 */

export function creemBaseUrl(apiKey) {
  return apiKey.startsWith('creem_test_') ? 'https://test-api.creem.io/v1' : 'https://api.creem.io/v1';
}

export function requireEnv(res) {
  const apiKey = process.env.CREEM_API_KEY || '';
  const productId = process.env.CREEM_PRODUCT_ID || '';
  if (!apiKey) {
    res.status(500).json({ error: 'Payments are not configured (CREEM_API_KEY missing).' });
    return null;
  }
  return { apiKey, productId };
}

export async function creemPost(apiKey, path, body) {
  let res;
  try {
    res = await fetch(`${creemBaseUrl(apiKey)}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, data: null };
  }
  let data = null;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

export function isMethod(req, res, method) {
  if (req.method !== method) {
    res.status(405).json({ error: `Method not allowed. Use ${method}.` });
    return false;
  }
  return true;
}

export function normalizeLicense(data) {
  if (!data || typeof data !== 'object') return { valid: false, instance_id: null };
  const valid =
    data.valid === true ||
    data.is_valid === true ||
    data.status === 'valid' ||
    data.status === 'active' ||
    (data.license && (data.license.status === 'valid' || data.license.status === 'active'));
  const instance_id =
    data.instance_id ?? data.instanceId ?? (data.instance && data.instance.id) ?? (data.license && data.license.instance_id) ?? null;
  return { valid: Boolean(valid), instance_id: typeof instance_id === 'string' ? instance_id : null };
}
