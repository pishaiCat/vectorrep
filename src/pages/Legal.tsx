export default function Legal({ page }: { page: 'privacy' | 'terms' | 'license' }) {
  if (page === 'privacy') {
    return (
      <div className="container narrow">
        <h1>Privacy Policy</h1>
        <p className="muted">Last updated: 15 October 2026. This page is a feature, not compliance boilerplate.</p>
        <h2>We collect nothing</h2>
        <p>
          VectorNest runs entirely in your browser. Your images are decoded, traced and exported on your own
          device. <strong>Zero image bytes leave your device</strong> — there is no upload, no cloud processing,
          no analytics beacon on your files.
        </p>
        <h2>What the app does send</h2>
        <ul>
          <li><strong>License checks only:</strong> when you activate a key, and once every 7 days after that, the app sends your license key and a per-device instance id to our own <code>/api/verify-license</code> endpoint. Images are never included.</li>
          <li><strong>Checkout:</strong> if you buy, Creem (our payment provider) processes your payment on its own pages under its own privacy policy. We never see your card details.</li>
        </ul>
        <h2>What is stored in your browser</h2>
        <ul>
          <li>Your license key + instance id + next re-validation date (localStorage).</li>
          <li>Your free-tier daily conversion counter (localStorage, resets at midnight).</li>
          <li>Benchmark email signups, if you use that form (localStorage only).</li>
        </ul>
        <p>Nothing else. There are no accounts, no cloud library, no tracking cookies. Verify it yourself: open the Network tab in DevTools and trace an image — you will see zero requests.</p>
      </div>
    );
  }
  if (page === 'terms') {
    return (
      <div className="container narrow">
        <h1>Terms of Service</h1>
        <p className="muted">Last updated: 15 October 2026. Plain English.</p>
        <h2>The product</h2>
        <p>VectorNest is a browser-based raster-to-vector converter for craft and laser work. Tracing and exports run locally in your browser. You are responsible for having the rights to the images you convert.</p>
        <h2>Your images</h2>
        <p>Your images never leave your device and we never see them. We make no claim over them.</p>
        <h2>Accuracy</h2>
        <p>Tracing is a best-effort conversion. Output quality depends on your source image: clean, high-contrast logos trace well; blurry photos and dense hatching may not. The free tier exists so you can judge quality before paying. Always test-cut or test-engrave before running production.</p>
        <h2>Refunds</h2>
        <p>14-day refunds, no questions asked. Contact support with your order email.</p>
        <h2>Availability</h2>
        <p>The app is provided “as is”, without warranties. We may update presets or the tracing engine; your license covers v1.x (see License).</p>
        <h2>Fair use</h2>
        <p>Do not resell or redistribute the app itself, its code, or license keys. Converting other people&apos;s artwork is your responsibility.</p>
      </div>
    );
  }
  return (
    <div className="container narrow">
      <h1>License</h1>
      <p className="muted">Last updated: 15 October 2026. Plain English.</p>
      <h2>What you buy</h2>
      <p>One payment of $79 buys a <strong>VectorNest v1.x license, forever</strong>. A future v2 — if one ever exists — is a separate product; nothing about v1.x stops working if v2 ships.</p>
      <h2>Devices</h2>
      <p>Each license key may be active on up to <strong>3 devices</strong> at once. Use “Deactivate on this device” on the Activate page to free a seat.</p>
      <h2>What the license unlocks</h2>
      <ul>
        <li>Unlimited conversions (free tier: 3/day)</li>
        <li>Clean SVG export (free tier: watermarked preview only)</li>
        <li>DXF export, vector PDF export, PNG up to 3x, batch ZIP of up to 20 images</li>
      </ul>
      <h2>Refunds</h2>
      <p>14 days, no questions asked. After a refund, the key is revoked and the app returns to the free tier.</p>
      <h2>What you may not do</h2>
      <p>Share, resell or publish your license key. Keys found shared may be revoked. The app itself may not be resold, repackaged or redistributed.</p>
    </div>
  );
}
