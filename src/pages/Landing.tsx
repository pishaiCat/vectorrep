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
          <a className="btn btn-primary" href="#/app">Try the free demo — no signup</a>
          <a className="btn" href="#/benchmark">See the benchmark</a>
        </div>
        <p className="proof">
          Free tier: 3 conversions a day, watermarked SVG + PNG up to 1024px. Paid: unlimited, full SVG, DXF, PDF, batch ZIP.
          Verify the privacy claim yourself — open the Network tab while you trace.
        </p>
      </section>

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
          <p className="muted">Unlimited conversions · Full SVG · DXF · Vector PDF · PNG up to 3x · Batch ZIP (20 images) · 3 devices · 14-day refunds</p>
          <p><a className="btn btn-primary" href="#/activate">Get VectorNest — $79</a></p>
          <p className="small muted">Checkout via Creem. Your license key is emailed automatically.</p>
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

      <h2>Benchmark teaser</h2>
      <div className="card">
        <p>
          In Phase 0, the official VTracer engine scored <strong>19/20 “good enough for cutting”</strong> on
          20 synthetic test images — 18 good, 1 acceptable, 1 fail. <strong>Read that carefully:</strong> those
          results were earned by VTracer on synthetic images, not by this MVP&apos;s engine and not on real
          customer files. The MVP ships with ImageTracer (pure JS, client-side) while the VTracer web-WASM
          swap is prepared. Full table, methodology and caveats on the{' '}
          <a href="#/benchmark">benchmark page</a>.
        </p>
      </div>

      <h2>Frequently asked questions</h2>
      <div className="faq">
        <details><summary>Is my data uploaded anywhere?</summary><p>No. Tracing and every export run in your browser, on your CPU. The only network request VectorNest makes is the license check when you activate or re-validate — and it sends only your license key, never images. Watch the Network tab while you trace.</p></details>
        <details><summary>What images work best?</summary><p>Clean, high-contrast logos, line art and flat-colour designs. The tool is for logos, line art and designs — not photos. A crisp source gives a crisp vector; a blurry low-res JPG will trace blurry.</p></details>
        <details><summary>Which machines does it support?</summary><p>Anything that reads SVG or DXF: Cricut and Silhouette (SVG), Glowforge, xTool and Omtech lasers (SVG/DXF), and most CNC and sign software (DXF R12).</p></details>
        <details><summary>What does the free tier include?</summary><p>3 conversions per day, all presets, a watermarked SVG preview and PNG export up to 1024px. Paid unlocks unlimited conversions, clean SVG, DXF, vector PDF, PNG up to 3x, and batch ZIP.</p></details>
        <details><summary>What is the refund policy?</summary><p>14 days, no questions asked. The free tier exists so you can verify quality before paying — but if it is not right for you, you get your money back.</p></details>
        <details><summary>What engine does the MVP use?</summary><p>ImageTracer (pure JS, client-side). The Phase 0 benchmark used the official VTracer engine in Node; its npm build is Node-targeted and cannot run in a browser build, so a web-target VTracer swap is planned. We do not claim VTracer output for the MVP.</p></details>
      </div>
    </div>
  );
}
