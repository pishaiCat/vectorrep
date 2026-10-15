import { useState } from 'react';

/**
 * Benchmark page — honest Phase 0 results.
 *
 * The verdicts below come from ~/workspace/vectornest-phase0/scorecard.json:
 * the OFFICIAL VTracer engine (@visioncortex/vtracer) run in Node on 20
 * SYNTHETIC images. They are NOT results of this MVP's ImageTracer engine
 * and NOT results on real customer files. Saying otherwise would be false.
 */

interface Row {
  file: string;
  category: string;
  description: string;
  preset: string;
  fidelity: number;
  verdict: 'good' | 'acceptable' | 'fail';
  reason: string;
}

const ROWS: Row[] = [
  { file: '01-logo-mountain.png', category: 'Logo / laser engraving', description: 'Circle badge, mountain peaks, thick outlines', preset: 'Laser Engrave', fidelity: 99.2, verdict: 'good', reason: 'Clean badge; smooth closed outlines, cut-ready.' },
  { file: '02-logo-coffee.png', category: 'Logo / laser engraving', description: 'Coffee cup outline, thin 3–4px strokes + steam curves', preset: 'Laser Engrave', fidelity: 99.9, verdict: 'good', reason: 'Thin cup + steam curves preserved; 8 clean paths.' },
  { file: '03-logo-hex-star.png', category: 'Logo / laser engraving', description: 'Hexagon badge with solid star, geometric', preset: 'Laser Engrave', fidelity: 99.5, verdict: 'good', reason: 'Geometric badge + star crisp; 2 paths.' },
  { file: '04-logo-leaf.png', category: 'Logo / laser engraving', description: 'Circular leaf / sunburst thin-line logo, 2–3px strokes', preset: 'Laser Engrave', fidelity: 99.0, verdict: 'good', reason: 'Thin 2–3px sunburst lines preserved.' },
  { file: '05-logo-noisy-scan.png', category: 'Logo / laser engraving', description: 'Scanned logo: grey noise, off-white paper, blurred edges', preset: 'Laser Engrave', fidelity: 98.5, verdict: 'good', reason: 'Speckle/noise did not leak into paths.' },
  { file: '06-vinyl-heart-banner.png', category: 'Vinyl / Cricut', description: 'Flat 2-colour heart + banner, sharp edges', preset: 'Cricut Vinyl', fidelity: 99.7, verdict: 'good', reason: 'Flat colours kept as separate layers (4 paths, 3 fills).' },
  { file: '07-vinyl-butterfly.png', category: 'Vinyl / Cricut', description: 'Flat 4-colour butterfly, symmetric wings', preset: 'Cricut Vinyl', fidelity: 99.3, verdict: 'good', reason: '10 paths / 6 fills; symmetric, weeding-friendly.' },
  { file: '08-vinyl-rainbow.png', category: 'Vinyl / Cricut', description: 'Flat 6-colour rainbow + cloud outlines', preset: 'Cricut Vinyl', fidelity: 99.0, verdict: 'good', reason: '19 paths / 9 fills; Cricut Vinyl preset beat Posterize (94%).' },
  { file: '09-vinyl-cat-moon.png', category: 'Vinyl / Cricut', description: 'Black cat silhouette + yellow moon on dark navy', preset: 'Cricut Vinyl', fidelity: 99.8, verdict: 'good', reason: 'Dark-navy background kept as its own layer.' },
  { file: '10-vinyl-mandala.png', category: 'Vinyl / Cricut', description: 'Concentric flat-colour circles + 24 small dots', preset: 'Cricut Vinyl', fidelity: 98.6, verdict: 'good', reason: 'All 24 small dots preserved.' },
  { file: '11-lineart-house.png', category: 'Line art', description: 'House + tree + sun, thin 2–3px line art', preset: 'Laser Engrave', fidelity: 99.8, verdict: 'good', reason: 'Thin house line art clean; 4 paths.' },
  { file: '12-lineart-bicycle.png', category: 'Line art', description: 'Bicycle with spoked wheels, 1px spokes', preset: 'Laser Engrave', fidelity: 99.3, verdict: 'acceptable', reason: 'Pixels faithful but 1px spokes too fragile to cut in vinyl — fine for engraving.' },
  { file: '13-lineart-flower.png', category: 'Line art', description: '12-petal flower, thin petal outlines + stem', preset: 'Laser Engrave', fidelity: 99.1, verdict: 'good', reason: '12 thin petals preserved; 14 paths.' },
  { file: '14-lineart-face.png', category: 'Line art', description: 'Minimal continuous-line face profile', preset: 'Laser Engrave', fidelity: 99.7, verdict: 'good', reason: 'Continuous-line face clean.' },
  { file: '15-lineart-maze.png', category: 'Line art', description: 'Dense diagonal maze hatch, 2px lines across full page', preset: 'Laser Engrave', fidelity: 94.0, verdict: 'fail', reason: 'One 182KB path with thousands of segments — faithful ≠ cuttable; weeding impossible. Pathological stress test, not a real craft input.' },
  { file: '16-stamp-star.png', category: 'Stamp / stencil', description: 'Bold solid star + bar stamp, thick shapes', preset: 'Stamp/Stencil', fidelity: 99.9, verdict: 'good', reason: 'Bold star + bar clean.' },
  { file: '17-stamp-est.png', category: 'Stamp / stencil', description: 'Double-ring circular stamp with block shapes', preset: 'Stamp/Stencil', fidelity: 99.2, verdict: 'good', reason: 'Double-ring stamp + blocks clean.' },
  { file: '18-stencil-abc.png', category: 'Stamp / stencil', description: 'Stencil block letters with white bridges/counters', preset: 'Stamp/Stencil', fidelity: 100.0, verdict: 'good', reason: 'Stencil bridges/counters preserved exactly; tiny 1.3KB output.' },
  { file: '19-stamp-paw.png', category: 'Stamp / stencil', description: 'Bold paw print, 5 solid blobs', preset: 'Stamp/Stencil', fidelity: 99.8, verdict: 'good', reason: '5 solid blobs clean.' },
  { file: '20-stencil-anchor.png', category: 'Stamp / stencil', description: 'Bold anchor stencil + grey speckle noise', preset: 'Stamp/Stencil', fidelity: 99.7, verdict: 'good', reason: 'Speckle noise filtered out; bold anchor clean.' },
];

const EXAMPLES = [
  { img: '/samples/06-vinyl-heart-banner.png', traced: '/samples/06-vinyl-heart-banner--vtracer-phase0.svg', title: 'Vinyl heart + banner — Cricut Vinyl, 99.7% fidelity, good' },
  { img: '/samples/02-logo-coffee.png', traced: '/samples/02-logo-coffee--vtracer-phase0.svg', title: 'Coffee logo — Laser Engrave, 99.9% fidelity, good' },
  { img: '/samples/18-stencil-abc.png', traced: '/samples/18-stencil-abc--vtracer-phase0.svg', title: 'Stencil ABC — Stamp/Stencil, 100% fidelity, good' },
];

export default function Benchmark() {
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);

  const saveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    try {
      const key = 'vectornest_benchmark_emails';
      const existing = JSON.parse(localStorage.getItem(key) ?? '[]') as string[];
      if (!existing.includes(trimmed)) {
        existing.push(trimmed);
        localStorage.setItem(key, JSON.stringify(existing));
      }
    } catch { /* localStorage unavailable — fall through to mailto */ }
    setSaved(true);
    window.location.href = `mailto:?subject=${encodeURIComponent('VectorNest — notify me about the VTracer upgrade')}&body=${encodeURIComponent(`Please notify me at ${trimmed} when VectorNest ships the VTracer web-WASM engine upgrade and craft presets.`)}`;
  };

  return (
    <div className="container">
      <h1>Benchmark: 20 images, traced and judged</h1>
      <div className="callout">
        <strong>SYNTHETIC images — read before quoting 19/20.</strong> All 20 test images were generated
        programmatically: clean shapes, flat colours, pure black on white, no JPEG artefacts, no gradients,
        no real typography, no low-res customer files. Real inputs will score lower. These results were
        earned by the <strong>official VTracer engine in a Node spike</strong> — they are <strong>not</strong> the
        output of this MVP&apos;s ImageTracer engine. Pixel fidelity ≠ cut-readiness: the maze below proves it
        (94% faithful, yet a fail).
      </div>

      <h2>Side-by-side examples (Phase 0, VTracer output — not the MVP engine)</h2>
      {EXAMPLES.map((ex) => (
        <div key={ex.img} style={{ marginBottom: 24 }}>
          <div className="compare">
            <figure><img src={ex.img} alt="Original test image" /><figcaption>Original (synthetic PNG)</figcaption></figure>
            <figure><img src={ex.traced} alt="Traced vector output from Phase 0" className="traced" /><figcaption>Traced — official VTracer, Phase 0 Node spike</figcaption></figure>
          </div>
          <p className="small muted">{ex.title}</p>
        </div>
      ))}
      <p>
        Want to see what the <em>current</em> MVP engine does on these same images?{' '}
        <a href="#/app">Open the Studio</a> and use the “Try a sample” buttons — same three files, traced live in your browser.
      </p>

      <h2>Full scorecard — 18 good, 1 acceptable, 1 fail (19/20)</h2>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Image</th><th>Category</th><th>Preset</th><th>Fidelity</th><th>Verdict</th><th>Reason</th></tr></thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.file}>
                <td><strong>{r.file}</strong><br /><span className="muted">{r.description}</span></td>
                <td>{r.category}</td>
                <td>{r.preset}</td>
                <td>{r.fidelity.toFixed(1)}%</td>
                <td className={`verdict-${r.verdict}`}>{r.verdict}</td>
                <td>{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Methodology</h2>
      <p className="muted">
        Each synthetic PNG (900×700) was traced with the official VTracer engine under a primary preset and an
        alternate preset; the primary result is shown. Fidelity = pixel agreement between the rasterized SVG and
        the source image. Verdicts combined fidelity, path/fill structure, node weight, and human judgement about
        whether the output could actually be cut or engraved. No competitor outputs (Vectorizer.ai, Inkscape,
        VectoSolve) were measured in Phase 0 — nothing about them is claimed here.
      </p>

      <h2>Get notified about the VTracer upgrade</h2>
      <div className="card">
        <p className="muted">
          The MVP ships with ImageTracer while the VTracer web-WASM swap is prepared. Leave your email and
          we will notify you when the upgrade lands. Your address is stored only in this browser&apos;s
          localStorage; the mailto that opens is a fallback so you can send it to us directly. No backend, no tracking.
        </p>
        {saved
          ? <p className="success">Saved in this browser. Your email app should have opened — send that message to complete the signup.</p>
          : <form onSubmit={saveEmail} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input className="input" style={{ maxWidth: 360 }} type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="btn btn-primary" type="submit">Notify me</button>
            </form>}
        <p className="small muted">Pre-order validation is still open — no payment link is live on this page yet.</p>
      </div>
    </div>
  );
}
