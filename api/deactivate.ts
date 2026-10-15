/**
 * POST /api/deactivate { key, instance_id } -> { deactivated: true }
 * Frees a license seat on this device. Failures still return success —
 * the client clears its local license either way.
 */
import { requireEnv, creemPost, isMethod } from './_creem';

export default async function handler(req: any, res: any) {
  if (!isMethod(req, res, 'POST')) return;
  const env = requireEnv(res);
  if (!env) return;
  const key = typeof req.body?.key === 'string' ? req.body.key.trim() : '';
  const instanceId = typeof req.body?.instance_id === 'string' ? req.body.instance_id : '';
  if (!key || !instanceId) {
    res.status(400).json({ error: 'A license key and instance id are required.' });
    return;
  }
  await creemPost(env.apiKey, '/licenses/deactivate', { key, instance_id: instanceId });
  res.status(200).json({ deactivated: true });
}
