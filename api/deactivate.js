/**
 * POST /api/deactivate { key, instance_id } -> { deactivated: true }
 * Always returns JSON, even on unexpected errors.
 */
import { requireEnv, creemPost, isMethod } from './_creem.js';

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
    const instanceId = typeof body.instance_id === 'string' ? body.instance_id : '';
    if (!key || !instanceId) {
      res.status(400).json({ error: 'A license key and instance id are required.' });
      return;
    }
    await creemPost(env.apiKey, '/licenses/deactivate', { key, instance_id: instanceId });
    res.status(200).json({ deactivated: true });
  } catch {
    try {
      res.status(200).json({ deactivated: true });
    } catch {
      // Response already sent.
    }
  }
}
