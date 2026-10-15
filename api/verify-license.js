/**
 * POST /api/verify-license { key, instance_id?, instance_name? }
 *   -> { valid, instance_id? } | { error }
 * Always returns JSON, even on unexpected errors.
 */
import { requireEnv, creemPost, isMethod, normalizeLicense } from './_creem.js';

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
    const key = typeof body.key === 'string' ? body.key.trim() : '';
    if (!key) {
      res.status(400).json({ error: 'A license key is required.' });
      return;
    }
    const instanceId = typeof body.instance_id === 'string' ? body.instance_id : undefined;
    const instanceName = typeof body.instance_name === 'string' ? body.instance_name : 'VectorNest';

    if (instanceId) {
      const { ok, data } = await creemPost(env.apiKey, '/licenses/validate', { key, instance_id: instanceId });
      if (!ok) {
        res.status(200).json({ valid: false, error: 'License could not be validated.' });
        return;
      }
      const { valid } = normalizeLicense(data);
      res.status(200).json({ valid, instance_id: instanceId });
      return;
    }

    const { ok, data } = await creemPost(env.apiKey, '/licenses/activate', { key, instance_name: instanceName });
    if (!ok) {
      res.status(200).json({ valid: false, error: 'License key is invalid, already fully activated, or revoked.' });
      return;
    }
    const { valid, instance_id } = normalizeLicense(data);
    if (!valid && !instance_id) {
      res.status(200).json({ valid: false, error: 'License could not be activated.' });
      return;
    }
    res.status(200).json({ valid: true, instance_id: instance_id ?? undefined });
  } catch {
    try {
      res.status(500).json({ error: 'License service temporarily unavailable. Please try again.' });
    } catch {
      // Response already sent.
    }
  }
}
