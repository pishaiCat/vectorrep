/**
 * POST /api/verify-license { key, instance_id?, instance_name? }
 *   -> { valid, instance_id? } | { error }
 *
 * If the client already has an instance_id (re-validation), the key is
 * validated for that instance. Otherwise the key is activated for a new
 * instance (first activation). The Creem API key stays server-side; the
 * license key is never echoed back in any response.
 */
import { requireEnv, creemPost, isMethod, normalizeLicense } from './_creem';

export default async function handler(req: any, res: any) {
  if (!isMethod(req, res, 'POST')) return;
  const env = requireEnv(res);
  if (!env) return;
  const key = typeof req.body?.key === 'string' ? req.body.key.trim() : '';
  if (!key) {
    res.status(400).json({ error: 'A license key is required.' });
    return;
  }
  const instanceId = typeof req.body?.instance_id === 'string' ? req.body.instance_id : undefined;
  const instanceName = typeof req.body?.instance_name === 'string' ? req.body.instance_name : 'VectorNest';

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

  const { ok, data } = await creemPost(env.apiKey, '/licenses/activate', {
    key,
    instance_name: instanceName,
  });
  if (!ok) {
    res.status(200).json({ valid: false, error: 'License key is invalid, already fully activated, or revoked.' });
    return;
  }
  const { valid, instance_id } = normalizeLicense(data);
  if (!valid && !instance_id) {
    // Some providers return only the instance on activate; treat a 2xx with
    // an instance id as a successful activation.
    res.status(200).json({ valid: false, error: 'License could not be activated.' });
    return;
  }
  res.status(200).json({ valid: true, instance_id: instance_id ?? undefined });
}
