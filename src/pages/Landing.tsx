export default function Landing() {
  return (
    <div className="container">
      <section className="hero">
        <p className="eyebrow">For Cricut · Glowforge · xTool · Omtech · sign &amp; print shops</p>
        <h1>Your customer&apos;s logo, cut-ready in seconds — without uploading it anywhere.</h1>
        <p className="lead">
          Drop in a PNG or JPG, pick the machine you&apos;re cutting on, and export a clean SVG or DXF
          that opens straight in Cricut Design Space, LightBurn, or RDWorks. Everything traces in your
          browser. No uploads. No subscription. $79 once.
        </p>
        <div className="cta-row">
          <a className="btn btn-primary" href="#/app">Trace your first file free — no signup</a>
          <a className="btn" href="#/activate">Get VectorNest — $79 once</a>
        </div>
        <p className="proof">
          Free tier: 3 conversions a day, watermarked SVG + PNG up to 1024px — try it before you pay anything.
          Paid: unlimited, clean SVG, DXF, vector PDF, PNG up to 3x, batch ZIP. Verify the privacy claim yourself —
          open the Network tab while you trace.
        </p>
      </section>

      <h2>How it works</h2>
      <div className="grid-3">
        <div className="card"><h3>1 · Drop in the file</h3><p className="muted">PNG, JPG or WebP — the logo a customer emailed you, a scan, a hand-drawn design. Up to 10&nbsp;MB, up to 20 at once.</p></div>
        <div className="card"><h3>2 · Pick your machine</h3><p className="muted">Laser Engrave, Laser Cut, Cricut Vinyl, Stamp / Stencil or Posterize. Each preset tunes colours, denoise and smoothing for that job — then tweak with sliders if you want.</p></div>
        <div className="card"><h3>3 · Export &amp; cut</h3><p className="muted">SVG for Cricut &amp; LightBurn, DXF (R12) for lasers &amp; CNC, vector PDF for print, PNG for previews. Check the side-by-side zoom to 400% first — vectors stay sharp.</p></div>
      </div>

      <h2>Machine presets, not generic tracing</h2>
      <p className="muted">Generic tracers hand back hundreds of tiny shapes and stray specks your machine then tries to cut one by one. Presets exist to stop that: each one removes specks, merges near-identical colours, and closes outlines for its machine.</p>
      <div className="grid-3">
        <div className="card"><h3>Laser Engrave</h3><p className="muted">Clean single-colour paths for engraving logos and line art on Glowforge, xTool and Omtech.</p></div>
        <div className="card"><h3>Laser Cut</h3><p className="muted">Smoother outlines, heavier denoise — fewer nodes, cleaner weeding, files that open in LightBurn and RDWorks.</p></div>
        <div className="card"><h3>Cricut Vinyl</h3><p className="muted">Flat colours kept as separate layers, so Design Space sees a cut file — not a picture in a box.</p></div>
        <div className="card"><h3>Stamp / Stencil</h3><p className="muted">Bold shapes, heavy denoise — bridges and counters preserved.</p></div>
        <div className="card"><h3>Posterize</h3><p className="muted">Up to 10 colours for multi-colour artwork.</p></div>
        <div className="card"><h3>Advanced sliders</h3><p className="muted">Colours, denoise, smoothing — tune any preset and re-trace in seconds.</p></div>
      </div>

      <h2>What you get, beyond the SVG</h2>
      <div className="grid-3">
        <div className="card"><h3>DXF (R12)</h3><p className="muted">For lasers and CNC — mm, inch or px units. The format the machine actually reads.</p></div>
        <div className="card"><h3>Vector PDF</h3><p className="muted">Real vector paths for print and suppliers — not a PNG embedded in a PDF.</p></div>
        <div className="card"><h3>Batch ZIP</h3><p className="muted">Queue up to 20 images, trace them in one pass, download one ZIP. Paid only.</p></div>
      </div>

      <h2>Why one payment beats a subscription</h2>
      <div className="grid-2">
        <div className="card price-card">
          <h3>VectorNest</h3>
          <p className="price">$79 <small>once, forever (v1.x)</small></p>
          <p className="muted">Unlimited conversions · Full SVG · DXF · Vector PDF · PNG up to 3x · Batch ZIP (20 images) · 3 devices · 14-day refunds</p>
          <p><a className="btn btn-primary" href="#/activate">Get VectorNest — $79</a></p>
          <p className="small muted">Checkout via Creem. Your license key is emailed automatically.</p>
        </div>
        <div className="card">
          <h3>The maths for sporadic craft work</h3>
          <p className="muted">
            Vectorizer.ai charges $9.99/month and uploads your images to its servers — download needs the subscription.
            Vector Magic online is $9.95/month, or $295 for the desktop edition.
            VectoSolve sells credit packs from $6.99 and subscriptions from $7.99/month (or $49/year) — and its free tier is one conversion.
            VectorizerKit traces in-browser like us, but charges $9.99/month or $79.99/year, with pay-per-file packs from $4.99/10.
          </p>
          <p className="muted">
            Craft work is sporadic — you should not pay rent on a tool you use a few times a month, and you should not
            have to upload a client&apos;s logo to a third-party server to trace it. $79 breaks even against the
            subscription leaders in about 8 months, and then it is yours. The free tier stays free, so you can verify
            quality before you pay anything.
          </p>
        </div>
      </div>

      <h2>VectorNest vs the usual options</h2>
      <div className="card">
        <table>
          <thead><tr><th></th><th>VectorNest</th><th>Vectorizer.ai / Vector Magic online</th><th>VectoSolve</th><th>VectorizerKit</th></tr></thead>
          <tbody>
            <tr><td><strong>Price</strong></td><td>$79 once</td><td>~$9.99 / month</td><td>Credits from $6.99 / subs from $7.99/mo</td><td>$9.99/mo or $79.99/yr / packs from $4.99</td></tr>
            <tr><td><strong>Where tracing happens</strong></td><td>Your browser — never uploaded</td><td>Uploaded to their servers</td><td>Uploaded to their servers</td><td>Your browser — never uploaded</td></tr>
            <tr><td><strong>Craft presets</strong></td><td>Yes — laser, Cricut, stamp, posterize</td><td>Generic</td><td>Yes — Cricut, laser, embroidery, stencil</td><td>Generic</td></tr>
            <tr><td><strong>DXF export</strong></td><td>Yes (R12)</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
            <tr><td><strong>Free tier</strong></td><td>3/day, watermarked SVG</td><td>Preview only — download needs subscription</td><td>1 free conversion</td><td>5 free downloads</td></tr>
          </tbody>
        </table>
        <p className="small muted">Competitor prices from their public pricing pages, checked October 2026 — they change; check before you decide. VectorizerKit&apos;s in-browser tracing and Vector Magic&apos;s desktop option are both real alternatives; the table shows where VectorNest differs: craft presets + no-upload + one payment.</p>
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
        <details><summary>Is my data uploaded anywhere?</summary><p>No. Tracing and every export run in your browser, on your CPU. The only network request VectorNest makes is the license check when you activate or re-validate — and it sends only your license key, never images. Watch the Network tab while you trace. (Vectorizer.ai and VectoSolve upload to their servers; VectorizerKit, like us, traces in-browser.)</p></details>
        <details><summary>What images work best?</summary><p>Clean, high-contrast logos, line art and flat-colour designs. The tool is for logos, line art and designs — not photos. A crisp source gives a crisp vector; a blurry low-res JPG will trace blurry. Around 1000px on the long edge is a comfortable floor.</p></details>
        <details><summary>Which machines does it support?</summary><p>Anything that reads SVG or DXF: Cricut and Silhouette (SVG), Glowforge, xTool and Omtech lasers (SVG/DXF), and most CNC and sign software (DXF R12).</p></details>
        <details><summary>What does the free tier include?</summary><p>3 conversions per day, all presets, a watermarked SVG preview and PNG export up to 1024px. Paid unlocks unlimited conversions, clean SVG, DXF, vector PDF, PNG up to 3x, and batch ZIP.</p></details>
        <details><summary>What if the result isn&apos;t good enough?</summary><p>You see the full result before paying — the free tier exists so you can verify quality first. And paid comes with 14-day, no-questions-asked refunds.</p></details>
        <details><summary>What is the refund policy?</summary><p>14 days, no questions asked.</p></details>
        <details><summary>What engine does the MVP use?</summary><p>ImageTracer (pure JS, client-side). The Phase 0 benchmark used the official VTracer engine in Node; its npm build is Node-targeted and cannot run in a browser build, so a web-target VTracer swap is planned. We do not claim VTracer output for the MVP.</p></details>
      </div>

      <section className="hero">
        <h2>Try it on a real file before you pay anything.</h2>
        <p className="lead">Drop in a logo. Check the preview at 400%. If the file is good enough to cut, buy it once and keep it.</p>
        <div className="cta-row">
          <a className="btn btn-primary" href="#/app">Open the Studio — free</a>
          <a className="btn" href="#/benchmark">Read the benchmark</a>
        </div>
      </section>
    </div>
  );
}
