# VectorNest

Turn PNG/JPG/WebP logos and designs into clean, machine-ready vector files (SVG/DXF/PNG/PDF)
tuned for Cricut, laser cutters and engravers — entirely in your browser. **No uploads. No
subscription. $79 once.**

## What it is

- **Studio (`#/app`)** — drag-drop or browse (PNG/JPG/WebP ≤ 10 MB, queue ≤ 20), 5 machine presets
  (Laser Engrave, Laser Cut, Cricut Vinyl, Stamp/Stencil, Posterize) + advanced sliders, side-by-side
  original/vector preview with 25–400% zoom, SVG/DXF/PNG/PDF export, batch ZIP.
- **Landing (`#/`)** — hero, preset showcase, pricing, FAQ, benchmark teaser.
- **Benchmark (`#/benchmark`)** — the honest Phase 0 scorecard (see the engine note below).
- **Activate (`#/activate`)** — buy via Creem, paste a license key, deactivate a device.
- **Legal** — Privacy (“we collect nothing”), Terms, License (v1.x forever, 3 devices, 14-day refunds).
- **API (`api/`)** — Vercel serverless: `checkout`, `verify-license`, `deactivate`. The Creem API
  key stays server-side; it is never sent to the browser or echoed in errors.

## Engine honesty — read this before quoting numbers

- **MVP engine: ImageTracer** (pure JS, client-side, `imagetracerjs@1.2.6`, Unlicense / public domain).
  All tracing and exports run on the customer's CPU. No image bytes leave the device except license checks.
- **VTracer web-WASM swap planned.** The official `@visioncortex/vtracer` npm build is Node-targeted
  (wasm-pack `--target nodejs`) and cannot run in a Vite browser build, so it is not in the MVP.
  The tracer is isolated behind `src/lib/tracer.ts` — only `traceImageData` needs to change when a
  web-target VTracer build exists.
- **The Phase 0 score of 19/20 was VTracer on SYNTHETIC images** (official engine, Node spike, 20
  programmatically generated PNGs). It is **not** the MVP engine's score and **not** a score on real
  customer files. The benchmark page says so in bold. Never claim VTracer output for the MVP.
- `@buzz-dee/vtrace` is deliberately **not** used: Phase 0 rejected it — its `getSVG()` flattens every
  trace to a single black path and destroys colour (0–68% vinyl fidelity).

## Free vs paid

| | Free | Paid ($79 license key) |
|---|---|---|
| Conversions | 3/day (localStorage, resets midnight) | Unlimited |
| SVG export | Watermarked preview only | Full clean SVG |
| DXF / vector PDF | — | Yes |
| PNG export | Up to 1024px longest edge | Up to 3x |
| Batch ZIP (20 images) | — | Yes |
| Presets | All | All |

Paid state lives in localStorage and re-validates against `/api/verify-license` every 7 days.
Revoked/expired keys downgrade gracefully to the free tier. DXF assumes 96 DPI
(1 px = 25.4/96 mm); Y is flipped so designs are not mirrored in laser software.

## Creem setup checklist

1. In Creem: create a **$79 one-time** product → **enable license keys** → set **activation limit 3**.
2. Copy the **product id** and your **API key** (use `creem_test_` keys first — the code picks the
   test API base automatically from the key prefix).
3. In Vercel → Project → Settings → Environment Variables, add:
   - `CREEM_API_KEY` — your Creem API key (test key first, live key at launch)
   - `CREEM_PRODUCT_ID` — the product id from step 1
   - `CREEM_SUCCESS_URL` — e.g. `https://yourdomain.com/#/activate`
4. Test end-to-end in test mode: buy → key emailed by Creem → paste at `#/activate` → paid features
   unlock → deactivate frees the seat → revoke test → downgrade works.
5. Switch to live keys only after the test purchase works.

## Local dev

```bash
npm install
npm run dev        # frontend only; /api/* needs `vercel dev` or a deployed preview
```

Deploy: push to GitHub → import in Vercel (framework preset **Vite**) → add the env vars above.

## Privacy proof

Open DevTools → Network tab, then trace and export an image. You will see **zero requests**
except the license check (which sends only the license key). Screenshot that for the landing page —
proof, not promises.
