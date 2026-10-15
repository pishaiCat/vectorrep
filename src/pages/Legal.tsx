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
          <li><strong>Purchase checks only:</strong> when you return from checkout, the app sends the checkout id to our own <code>/api/verify-purchase</code> endpoint, which confirms the payment with Creem and records the purchase (email, order id, status) in our database so you can restore access later. When you restore, it sends the email you enter for the same check. Images are never included.</li>
          <li><strong>Checkout:</strong> if you buy, Creem (our payment provider) processes your payment on its own pages under its own privacy policy. We never see your card details.</li>
        </ul>
        <h2>What is stored in your browser</h2>
        <ul>
          <li>A paid flag + the email you restored with (localStorage) — this is how the app knows this device is unlocked. No key, no account.</li>
          <li>Your free-tier daily conversion counter (localStorage, resets at midnight).</li>
          <li>Benchmark email signups, if you use that form (localStorage only).</li>
        </ul>
        <h2>What is stored on our server</h2>
        <ul>
          <li>Purchase records for paid customers only (checkout/order id, email, status, product) — the minimum needed to confirm and restore a purchase. No images, ever.</li>
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
        <p>The app is provided “as is”, without warranties. We may update presets or the tracing engine; your purchase covers v1.x (see License).</p>
        <h2>Fair use</h2>
        <p>Do not resell or redistribute the app itself or its code. Converting other people&apos;s artwork is your responsibility.</p>
      </div>
    );
  }
  return (
    <div className="container narrow">
      <h1>License</h1>
      <p className="muted">Last updated: 15 October 2026. Plain English.</p>
      <h2>What you buy</h2>
      <p>One payment of $79 buys <strong>VectorNest v1.x, forever</strong>. A future v2 — if one ever exists — is a separate product; nothing about v1.x stops working if v2 ships.</p>
      <h2>Devices</h2>
      <p>Paid access unlocks per device and is stored in that browser. Bought on another device? Open the Get access page there and restore with your checkout email — no key needed, no seat limit to manage.</p>
      <h2>What the purchase unlocks</h2>
      <ul>
        <li>Unlimited conversions (free tier: 3/day)</li>
        <li>Clean SVG export (free tier: watermarked preview only)</li>
        <li>DXF export, vector PDF export, PNG up to 3x, batch ZIP of up to 20 images</li>
      </ul>
      <h2>Refunds</h2>
      <p>14 days, no questions asked. After a refund, paid access is removed — restore checks will return unpaid and the app returns to the free tier.</p>
      <h2>What you may not do</h2>
      <p>The app itself may not be resold, repackaged or redistributed.</p>
    </div>
  );
}
