export default function Landing() {
  return (
    <div className="container lp">
      {/* 1 — HERO: name the exact painful moment, promise the outcome, kill the risks */}
      <section className="hero lp-hero">
        <p className="eyebrow">For laser shops · vinyl cutters · sign &amp; print · Etsy sellers</p>
        <h1>Your customer sent a JPG. The job is stalled. Unstick it in about a minute.</h1>
        <p className="lead">
          A JPG has no paths for a blade or a laser head to follow — so the job can&apos;t cut, can&apos;t
          engrave as a vector, and can&apos;t ship. Drop that file in, pick the machine you&apos;re cutting on,
          and export an SVG or DXF your software treats as a real cut file. No upload. No subscription. $79 once.
        </p>
        <div className="cta-row">
          <a className="btn btn-primary btn-lg" href="#/app">Trace your file free — no signup</a>
          <a className="btn btn-lg" href="#/activate">Get VectorNest — $79 once</a>
        </div>
        <p className="proof">
          Try it on <em>your</em> file, not a demo image. Free tier: 3 conversions a day, all presets,
          watermarked SVG + PNG up to 1024px. Your client&apos;s artwork never leaves your browser —
          verify it in the Network tab while you trace.
        </p>
      </section>

      {/* 2 — PAIN MIRROR: the four ways this job goes wrong today, in their language */}
      <section>
        <h2 className="section-title">Sound familiar?</h2>
        <div className="grid-2 lp-pain">
          <div className="card">
            <h3>“Can you just use the logo off our Facebook page?”</h3>
            <p className="muted">
              A 200px screenshot, a blurry email attachment, a photo of a sign. Every shop knows this file.
              It engraves as a smudge and it cannot cut at all — a bitmap has no outline for the machine to follow.
            </p>
          </div>
          <div className="card">
            <h3>The weed that never ends</h3>
            <p className="muted">
              A rough auto-trace turns one design into a hundred specks, slivers and doubled edges. You find out
              at the weeding table, picking out pinhead pieces that lift, tear, and ruin the piece — after
              you&apos;ve already cut good vinyl.
            </p>
          </div>
          <div className="card">
            <h3>An evening lost to node cleanup</h3>
            <p className="muted">
              Free tracers hand you a file that <em>looks</em> done — until you open it and find a circle made of
              hundreds of polyline segments, double lines, and open paths. So you spend the evening deleting nodes
              one by one, simplifying, re-tracing. The “free” tool cost you the evening.
            </p>
          </div>
          <div className="card">
            <h3>The paywall at the download button</h3>
            <p className="muted">
              You upload, wait, perfect the preview — and only at download discover it needs a subscription.
              For one logo a year, that&apos;s a month&apos;s rent on thirty seconds of work. The preview was free;
              the file was never going to be.
            </p>
          </div>
        </div>
        <p className="muted lp-pain-close">
          VectorNest is built to kill all four: trace on <strong>your</strong> file before paying, presets that
          remove specks and smooth nodes <em>at trace time</em>, and a free tier that gives you a real file —
          not just a preview of one.
        </p>
      </section>

      {/* 3 — THE JOB FLOW */}
      <section>
        <h2 className="section-title">From stalled job to cut file</h2>
        <div className="grid-3">
          <div className="card lp-step"><span className="step-num">1</span><h3>Drop in the JPG</h3><p className="muted">The customer&apos;s PNG, JPG or WebP — a logo, a sketch, a scan. Up to 10&nbsp;MB, up to 20 at once. It stays on your machine.</p></div>
          <div className="card lp-step"><span className="step-num">2</span><h3>Pick your machine</h3><p className="muted">Laser Cut, Laser Engrave, Cricut Vinyl, Stamp / Stencil or Posterize. Each preset tunes colours, denoise and smoothing for that job — then tweak with sliders if you want.</p></div>
          <div className="card lp-step"><span className="step-num">3</span><h3>Check it, export it, cut it</h3><p className="muted">Side-by-side preview, zoom to 400% — vectors stay sharp. Export SVG, DXF (R12), vector PDF or PNG. Do a test cut on scrap, then run the job.</p></div>
        </div>
      </section>

      {/* 4 — PROOF: don't trust screenshots, trace your own file */}
      <section>
        <h2 className="section-title">Proof means your file, not our screenshots</h2>
        <div className="card lp-proof">
          <p>
            We could show you glossy before-and-afters. They&apos;d prove nothing about <em>your</em> logo —
            every shop&apos;s hard file is different. So the proof is the free tier itself: drop in the worst
            file on your desk, trace it, zoom to 400%, and judge the paths. If they&apos;re not good enough
            to cut, you&apos;ve spent nothing and learned it in a minute.
          </p>
          <p className="muted">
            Want a starting point? The Studio has three sample files (coffee logo, heart banner, stencil letters)
            you can trace in one click. And the{' '}
            <a href="#/benchmark">benchmark page</a> shows our full Phase 0 scorecard — with its limits stated
            plainly: <strong>19/20 “good enough for cutting” was the VTracer engine on synthetic images</strong>,
            not this MVP&apos;s engine and not real customer files. The MVP ships with ImageTracer (pure JS,
            client-side) while a web-target VTracer swap is prepared. We don&apos;t claim VTracer output for the MVP.
          </p>
          <p><a className="btn btn-primary" href="#/app">Open the Studio — trace your file free</a></p>
        </div>
      </section>

      {/* 5 — PRESETS AS JOB FIXES */}
      <section>
        <h2 className="section-title">Presets that fix the machine&apos;s complaints</h2>
        <p className="muted lp-section-sub">
          A generic tracer gives every job the same settings — that&apos;s how you get specks, slivers and
          node soup. Each preset below is tuned for what its machine chokes on.
        </p>
        <div className="lp-presets">
          <div className="card lp-preset"><h3>Laser Cut</h3><p className="muted"><strong>Fixes:</strong> jagged outlines, stray specks the laser tries to cut one by one, too many nodes making the head stutter. Smoother outlines, heavier denoise, closed paths — opens in LightBurn and RDWorks.</p></div>
          <div className="card lp-preset"><h3>Laser Engrave</h3><p className="muted"><strong>Fixes:</strong> muddy engraving from colour and shading. Clean single-colour paths for logos and line art on Glowforge, xTool and Omtech.</p></div>
          <div className="card lp-preset"><h3>Cricut Vinyl</h3><p className="muted"><strong>Fixes:</strong> the hundred-speck weed, and Design Space re-tracing your file. Flat colours kept as separate layers, so it lands as a cut file — not a picture in a box — with bold, spaced paths that peel in one piece.</p></div>
          <div className="card lp-preset"><h3>Stamp / Stencil</h3><p className="muted"><strong>Fixes:</strong> bridges and counters filling in, fragile thin spots tearing. Bold shapes, heavy denoise, bridges preserved.</p></div>
          <div className="card lp-preset"><h3>Posterize</h3><p className="muted"><strong>Fixes:</strong> multi-colour artwork collapsing into mush. Up to 10 colours for designs where colour is the point.</p></div>
          <div className="card lp-preset"><h3>Advanced sliders</h3><p className="muted"><strong>Fixes:</strong> the one file that needs a human call. Colours, denoise, smoothing — tune any preset and re-trace in seconds.</p></div>
        </div>
      </section>

      {/* 6 — WHAT YOU GET BEYOND THE SVG */}
      <section>
        <h2 className="section-title">What you get, beyond the SVG</h2>
        <div className="grid-3">
          <div className="card"><h3>DXF (R12)</h3><p className="muted">For lasers and CNC — mm, inch or px units. The format the machine actually reads.</p></div>
          <div className="card"><h3>Vector PDF</h3><p className="muted">Real vector paths for print and suppliers — not a PNG embedded in a PDF. (Some converters ship exactly that “fake vectorization” — zoom to 400% and it goes soft. Ours stays sharp.)</p></div>
          <div className="card"><h3>Batch ZIP</h3><p className="muted">Queue up to 20 images, trace them in one pass, download one ZIP. Paid only — this is the “twenty customer logos before lunch” feature.</p></div>
        </div>
      </section>

      {/* 7 — HONEST COMPARISON */}
      <section>
        <h2 className="section-title">VectorNest vs the usual options</h2>
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
      </section>

      {/* 8 — PRICING, framed against the real alternatives */}
      <section>
        <h2 className="section-title">One payment, because your work is sporadic</h2>
        <div className="grid-2">
          <div className="card price-card">
            <h3>VectorNest</h3>
            <p className="price">$79 <small>once, forever (v1.x)</small></p>
            <p className="muted">Unlimited conversions · Full SVG · DXF · Vector PDF · PNG up to 3x · Batch ZIP (20 images) · 3 devices · 14-day refunds</p>
            <p><a className="btn btn-primary" href="#/activate">Get VectorNest — $79</a></p>
            <p className="small muted">Checkout via Creem. Your license key is emailed automatically. Not a subscription — it never renews.</p>
          </div>
          <div className="card">
            <h3>Do the maths on your actual usage</h3>
            <p className="muted">
              A subscription charges you every month whether you traced one logo or fifty. Craft work comes in
              bursts — a quiet month still bills you. $79 breaks even against the $9.99/month leaders in about
              8 months, and then it&apos;s yours.
            </p>
            <p className="muted">
              The other way to buy this job is a manual tracing service: typically a per-image fee and a day or
              two of waiting, every single time. Three or four of those orders cost more than VectorNest — and
              you still waited. Or Inkscape Trace Bitmap: free, and an evening of node cleanup per file.
              VectorNest is priced for the shop that wants the file now, without rent and without the evening.
            </p>
          </div>
        </div>
      </section>

      {/* 9 — OBJECTIONS, answered honestly */}
      <section>
        <h2 className="section-title">Before you ask…</h2>
        <div className="faq">
          <details><summary>Will it actually cut clean, or will I be weeding specks all night?</summary><p>That&apos;s the right question, and the honest answer is: it depends on your file. Clean, high-contrast logos and flat-colour designs trace into bold, spaced paths that weed in one piece. Noisy, low-res files produce specks in <em>any</em> tracer — that&apos;s why the presets remove specks at trace time, and why you should judge the free tier on your worst file before paying. Always do a test cut on scrap before good material.</p></details>
          <details><summary>My logo is tiny / blurry. Will this fix it?</summary><p>No tool can invent detail that isn&apos;t in the file. A blurry logo traces blurry. If the source is under ~1000px on the long edge, ask the customer for a bigger version first — that one email saves more quality than any setting. If the file is simple and high-contrast, even a small source can trace well; if it&apos;s tiny, text-heavy or brand-critical, it may need a manual redraw instead, and we&apos;d rather tell you that than sell you a mushy trace.</p></details>
          <details><summary>What about fine detail — thin lines, tiny text, hairlines?</summary><p>Thin lines are where traces fail. A 1px line at screen size can vanish or break up at cut size, and detail smaller than your material can hold will tear while weeding. If a detail won&apos;t read at your final cut size, simplify it or size the design up. The Studio preview at 400% plus a test cut will tell you the truth before you commit material.</p></details>
          <details><summary>Can it do photos?</summary><p>No — and we don&apos;t pretend otherwise. Photos become engrave material, not cut files, in every tool. VectorNest is for logos, line art and designs. If someone promises you a cut-ready vector from a photo, be sceptical.</p></details>
          <details><summary>Isn&apos;t Inkscape free? Why pay $79?</summary><p>Inkscape Trace Bitmap is free and capable — if you&apos;re willing to spend the evening: simplify nodes, delete double lines, close paths, separate colours by hand, remove the embedded bitmap it leaves behind. VectorNest is for the job where that evening costs more than $79: the presets, the DXF/PDF/batch exports, and the one-click flow. Try the free tier on a real file and compare the time, not just the price.</p></details>
          <details><summary>What about $4.99 credit packs — aren&apos;t they cheaper?</summary><p>For one file, yes. For a shop, packs are rent in disguise: you pay per file forever, and the meter is always running when a customer sends you twenty logos. $79 once ends the meter. If you genuinely trace one file a year, use the free tier or a pack — we&apos;d rather have you as a free user than a bad purchase.</p></details>
          <details><summary>Is my client&apos;s artwork uploaded anywhere?</summary><p>No. Tracing and every export run in your browser, on your CPU. The only network request VectorNest makes is the license check when you activate or re-validate — and it sends only your license key, never images. Watch the Network tab while you trace. (Vectorizer.ai and VectoSolve upload to their servers; VectorizerKit, like us, traces in-browser.) This matters because client logos are often unreleased work — uploading them to a stranger&apos;s server is a real professional risk.</p></details>
          <details><summary>Which machines does it support?</summary><p>Anything that reads SVG or DXF: Cricut and Silhouette (SVG), Glowforge, xTool and Omtech lasers (SVG/DXF), and most CNC and sign software (DXF R12). The SVG lands in Design Space as a cut layer, not a print layer.</p></details>
          <details><summary>What if the result isn&apos;t good enough?</summary><p>You see the full result before paying — the free tier exists so you can verify quality first. And paid comes with 14-day, no-questions-asked refunds.</p></details>
          <details><summary>What engine does the MVP use?</summary><p>ImageTracer (pure JS, client-side). The Phase 0 benchmark used the official VTracer engine in Node; its npm build is Node-targeted and cannot run in a browser build, so a web-target VTracer swap is planned. We do not claim VTracer output for the MVP.</p></details>
        </div>
      </section>

      {/* 10 — CLOSING CTA */}
      <section className="hero lp-cta">
        <h2>That stalled job is one file away from shipping.</h2>
        <p className="lead">Drop in the worst logo on your desk. Check the preview at 400%. If the file is good enough to cut, buy it once and keep it.</p>
        <div className="cta-row">
          <a className="btn btn-primary btn-lg" href="#/app">Open the Studio — free</a>
          <a className="btn btn-lg" href="#/benchmark">Read the benchmark</a>
        </div>
        <p className="proof">No signup. No upload. No subscription. $79 once, 14-day refunds.</p>
      </section>
    </div>
  );
}
