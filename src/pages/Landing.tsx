export default function Landing() {
  return (
    <div className="container">
      <section className="hero">
        <h1>Turn any logo into cut-ready vectors in your browser. No uploads. $79 once.</h1>
        <p className="lead">
          Drop in a PNG or JPG, pick your machine preset, and export SVG, DXF, PNG or PDF —
          tuned for Cricut, Glowforge, xTool and Omtech. Your images never leave your device.
        </p>
        <div className="cta-row">
          <a className="btn btn-primary" href="/app">Try the free demo — no signup</a>
        </div>
        <p className="proof">
          Free tier: 10 conversions a day, clean SVG + PNG up to 1024px. Paid: unlimited, DXF, PDF, batch ZIP —
          a $3.99 3-day pass or $79 once. Verify the privacy claim yourself — open the Network tab while you trace.
        </p>
      </section>

      <h2>Free converters</h2>
      <div className="grid-3">
        <div className="card"><h3><a href="/free/png-to-svg">PNG to SVG</a></h3><p className="muted">Convert a PNG to a clean vector SVG — free, no upload, no watermark.</p></div>
        <div className="card"><h3><a href="/free/jpg-to-svg">JPG to SVG</a></h3><p className="muted">Turn a JPEG logo or artwork into a scalable SVG, right in your browser.</p></div>
        <div className="card"><h3><a href="/free/image-to-vector">Image to Vector</a></h3><p className="muted">Any image — PNG, JPG or WebP — traced into machine-ready vector paths.</p></div>
        <div className="card"><h3><a href="/free/webp-to-svg">WebP to SVG</a></h3><p className="muted">WebP is for the web. SVG is for cutting, engraving and print. Convert free.</p></div>
        <div className="card"><h3>Free tier, honestly</h3><p className="muted">10 conversions a day in the Studio too — clean SVG, all presets, PNG up to 1024px. No signup.</p></div>
        <div className="card"><h3>Why free?</h3><p className="muted">Because you should verify quality before paying anyone. Paid adds DXF, batch and no cap.</p></div>
      </div>

      <h2>Machine presets, not generic tracing</h2>
      <div className="grid-3">
        <div className="card"><h3>Laser Engrave</h3><p className="muted">Clean single-colour paths for engraving logos and line art.</p></div>
        <div className="card"><h3>Laser Cut</h3><p className="muted">Smoother outlines, heavier denoise — fewer nodes, cleaner weeding.</p></div>
        <div className="card"><h3>Cricut Vinyl</h3><p className="muted">Flat colours kept as separate layers for vinyl cutting.</p></div>
        <div className="card"><h3>Stamp / Stencil</h3><p className="muted">Bold shapes, heavy denoise — bridges and counters preserved.</p></div>
        <div className="card"><h3>Posterize</h3><p className="muted">Up to 10 colours for multi-colour artwork.</p></div>
        <div className="card"><h3>Advanced sliders</h3><p className="muted">Colours, denoise, smoothing — tune any preset and re-trace in seconds.</p></div>
      </div>

      <h2>Pricing</h2>
      <div className="grid-2">
        <div className="card price-card">
          <h3>VectorNest</h3>
          <p className="price">$79 <small>once, forever (v1.x)</small></p>
          <p className="muted">Unlimited conversions · Full SVG · DXF · Vector PDF · PNG up to 3x · Batch ZIP (20 images) · Use on any device you sign in on · 14-day refunds</p>
          <p><a className="btn btn-primary" href="/activate">Get VectorNest — $79</a></p>
          <p className="small muted">Just one project? There&apos;s also a <a href="/activate">3-Day Pass for $3.99</a> — everything unlocked for 72 hours. Checkout via Creem. Your receipt is emailed automatically.</p>
        </div>
        <div className="card">
          <h3>Why one payment beats a subscription</h3>
          <p className="muted">
            Vectorizer.ai is $9.99/month. VectoSolve is $7.99/month or credits that punish sporadic use.
            Vector Magic desktop is $295. Craft work is sporadic — you should not pay rent on a tool you use
            a few times a month. $79 breaks even against the subscription leaders in about 8 months, and then
            it is yours. The free tier stays free, so you can verify quality before you pay anything.
          </p>
        </div>
      </div>

      <h2>Frequently asked questions</h2>
      <div className="faq">
        <details><summary>Is my data uploaded anywhere?</summary><p>No. Tracing and every export run in your browser, on your CPU. The only network requests VectorNest makes are the purchase check when you unlock or restore — and they send only your checkout ID or email, never images. Watch the Network tab while you trace.</p></details>
        <details><summary>What images work best?</summary><p>Clean, high-contrast logos, line art and flat-colour designs. The tool is for logos, line art and designs — not photos. A crisp source gives a crisp vector; a blurry low-res JPG will trace blurry.</p></details>
        <details><summary>Which machines does it support?</summary><p>Anything that reads SVG or DXF: Cricut and Silhouette (SVG), Glowforge, xTool and Omtech lasers (SVG/DXF), and most CNC and sign software (DXF R12).</p></details>
        <details><summary>What does the free tier include?</summary><p>10 conversions per day, all presets, a clean SVG download (no watermark) and PNG export up to 1024px. Paid (3-Day Pass $3.99 or Lifetime $79) unlocks unlimited conversions, DXF, vector PDF, PNG up to 3x, and batch ZIP.</p></details>
        <details><summary>What is the refund policy?</summary><p>14 days, no questions asked. The free tier exists so you can verify quality before paying — but if it is not right for you, you get your money back.</p></details>
        <details><summary>What engine does the MVP use?</summary><p>ImageTracer (pure JS, client-side). Phase 0 testing used the official VTracer engine in Node; its npm build is Node-targeted and cannot run in a browser build, so a web-target VTracer swap is planned. We do not claim VTracer output for the MVP.</p></details>
      </div>
    </div>
  );
}
