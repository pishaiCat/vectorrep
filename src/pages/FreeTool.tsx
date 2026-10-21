import { useEffect } from 'react';
import FreeConverter from '../components/FreeConverter';
import AdSlot from '../components/AdSlot';
import { useAuth } from '../lib/auth';
import { isPaid } from '../lib/purchase';

export type FreeSlug = 'png-to-svg' | 'jpg-to-svg' | 'image-to-vector' | 'webp-to-svg';

interface FreePageConfig {
  slug: FreeSlug;
  title: string;
  metaDescription: string;
  h1: string;
  accept: string;
  inputLabel: string;
  intro: string[];
  faq: Array<{ q: string; a: string }>;
}

const PAGES: Record<FreeSlug, FreePageConfig> = {
  'png-to-svg': {
    slug: 'png-to-svg',
    title: 'PNG to SVG Converter — Free, No Upload | VectorNest',
    metaDescription: 'Convert PNG to SVG free in your browser. No upload, no watermark, no signup — 10 free conversions a day. Clean vector output for Cricut, laser and print.',
    h1: 'PNG to SVG Converter — free, private, no upload',
    accept: '.png,image/png',
    inputLabel: 'PNG',
    intro: [
      'Drop a PNG in and get a clean, scalable SVG out — free. The conversion runs entirely in your browser: your image is never uploaded to a server, never stored, and never seen by anyone. That matters when the file is a client logo, an unreleased product design, or artwork you sell.',
      'Most "free" PNG to SVG converters make you pay at the exact moment you click download, or stamp a watermark across the result. This one does neither: the SVG you download is the real, clean file, ready to open in Cricut Design Space, Silhouette Studio, LightBurn, Illustrator or Inkscape. You get 10 free conversions a day, one file at a time — enough for most logos, icons and designs.',
      'For best results, start with a clean, high-contrast PNG. Logos, line art and flat-colour designs trace beautifully; busy photographs do not — no tracer can invent detail that is not in the source. If your PNG has a transparent background, the transparency is respected: only the visible shapes become paths.',
      'Need more than SVG? The full VectorNest Studio adds DXF for laser and CNC, vector PDF, PNG exports up to 3x, batch conversion of up to 20 files at once, and presets tuned for Cricut, Glowforge, xTool and Omtech — with no daily limit.',
    ],
    faq: [
      { q: 'Is this PNG to SVG converter really free?', a: 'Yes. 10 conversions a day are free, the downloaded SVG is clean (no watermark), and there is no signup. The paid Studio exists for people who need DXF, batch conversion, vector PDF and no daily cap.' },
      { q: 'Is my PNG uploaded to a server?', a: 'No. The tracing runs in your browser on your own device. You can verify it: open your browser\'s Network tab while converting and watch — no image data leaves your machine.' },
      { q: 'Why only 10 a day?', a: 'The free tier is meant for everyday use — a logo here, a design there. If you convert files all day for a shop or a product line, the Studio removes the cap and adds batch processing.' },
      { q: 'What PNGs convert best?', a: 'Clean, high-contrast images: logos, icons, line art, flat-colour illustrations. Low-resolution or blurry PNGs trace blurry — a bigger, crisper source always gives a crisper vector.' },
      { q: 'Can I use the SVG on my Cricut or laser?', a: 'Yes — the SVG opens directly in Cricut Design Space and laser software. If your machine needs DXF instead, the Studio exports DXF (R12) with machine presets.' },
    ],
  },
  'jpg-to-svg': {
    slug: 'jpg-to-svg',
    title: 'JPG to SVG Converter — Free, No Upload | VectorNest',
    metaDescription: 'Convert JPG to SVG free in your browser. No upload, no watermark, no signup — 10 free conversions a day. Turn JPEG logos and artwork into scalable vectors.',
    h1: 'JPG to SVG Converter — free, private, no upload',
    accept: '.jpg,.jpeg,image/jpeg',
    inputLabel: 'JPG',
    intro: [
      'Turn a JPG into a scalable SVG without uploading it anywhere. This converter runs 100% in your browser: drop in a JPEG, and the vector is traced on your own device. No server ever receives your image — a real difference when the file is a customer\'s logo or a design you have not published yet.',
      'JPEGs are trickier than PNGs: the format adds compression noise and soft edges, especially around text and logos. This converter smooths that noise while tracing, so flat logos and artwork come out as clean paths instead of a thousand speckles. The download is a real, clean SVG — no watermark, no "pay to unlock your file" moment. You get 10 free conversions a day, one file at a time.',
      'A honest tip: if you also have the PNG version of your image, use it instead — PNG traces cleaner than JPG every time. If the JPG is all you have, a larger, less-compressed file will always give you a better vector.',
      'When you outgrow single SVGs, the VectorNest Studio adds DXF export for laser cutters and CNC, vector PDF, PNG up to 3x, batch conversion for up to 20 files, and presets for Cricut, Glowforge, xTool and Omtech.',
    ],
    faq: [
      { q: 'Is this JPG to SVG converter free?', a: 'Yes — 10 conversions a day, clean SVG downloads, no watermark and no signup. Paid plans only add formats (DXF, PDF), batch conversion and remove the daily cap.' },
      { q: 'Why does my JPG trace look rough?', a: 'JPEG compression blurs edges and adds noise. The converter smooths while tracing, but a low-quality JPG can only give a low-quality vector. Re-export the source at higher quality if you can, or use a PNG version.' },
      { q: 'Is my image uploaded?', a: 'No. Everything happens locally in your browser. Check the Network tab while you convert — nothing leaves your device.' },
      { q: 'JPG or PNG — which should I convert?', a: 'PNG, whenever you have the choice. PNG keeps hard edges and flat colours exact, which is what a tracer needs. JPG is fine for logos saved at high quality.' },
      { q: 'Can I convert a photo?', a: 'You can, but the result will be a stylised, poster-like vector — tracing simplifies. This tool is built for logos, artwork and designs, not photographic detail.' },
    ],
  },
  'image-to-vector': {
    slug: 'image-to-vector',
    title: 'Image to Vector Converter — Free, No Upload | VectorNest',
    metaDescription: 'Convert any image to a vector (SVG) free in your browser. PNG, JPG and WebP — no upload, no watermark, no signup. 10 free conversions a day.',
    h1: 'Image to Vector Converter — free, private, no upload',
    accept: '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp',
    inputLabel: 'image',
    intro: [
      'A raster image (PNG, JPG, WebP) is a grid of pixels: enlarge it and it blurs. A vector is a set of paths: enlarge it forever and it stays sharp. This free converter traces your image into a true vector SVG — in your browser, with no upload, no watermark and no signup. You get 10 free conversions a day.',
      'Vectors are what machines and print actually want. A Cricut or vinyl cutter follows paths, not pixels. A laser engraver traces outlines. A print shop scaling your logo to a banner needs curves, not a bigger blur. Converting an image to vector is how a screenshot of a logo becomes a file you can cut, engrave, print and sell.',
      'Because everything runs on your device, your images stay yours. Client work, unreleased designs, personal photos — none of it touches a server. That also makes it fast: there is no upload queue, so even a large image converts in seconds.',
      'The free converter exports clean SVG, one file at a time. The full VectorNest Studio goes further: DXF (R12) for laser and CNC, vector PDF, PNG up to 3x, batch conversion of 20 files at once, and presets tuned for Cricut, Glowforge, xTool and Omtech machines — for a 3-Day Pass at $3.99 or Lifetime at $79 once.',
    ],
    faq: [
      { q: 'What is the difference between an image and a vector?', a: 'An image is pixels — fixed resolution, blurry when enlarged. A vector is mathematical paths — infinitely scalable, and the format cutting machines, lasers and print shops work with.' },
      { q: 'Which image formats can I convert?', a: 'PNG, JPG/JPEG and WebP. PNG usually traces cleanest; JPG works well for high-quality logos; WebP is supported on its own page too.' },
      { q: 'Is it really free and private?', a: 'Yes. 10 conversions a day, clean downloads, no watermark, no account — and the conversion runs locally in your browser, so your image is never uploaded.' },
      { q: 'What images convert best?', a: 'Logos, icons, line art, flat-colour illustrations and stencils. Photographs become simplified, poster-style vectors — tracing cannot recover detail the source does not have.' },
      { q: 'What if I need DXF or lots of files at once?', a: 'That is the paid Studio: DXF and vector PDF exports, batch ZIP for up to 20 files, machine presets and no daily cap — $3.99 for a 3-day pass or $79 lifetime.' },
    ],
  },
  'webp-to-svg': {
    slug: 'webp-to-svg',
    title: 'WebP to SVG Converter — Free, No Upload | VectorNest',
    metaDescription: 'Convert WebP to SVG free in your browser. No upload, no watermark, no signup — 10 free conversions a day. Turn WebP logos and graphics into scalable vectors.',
    h1: 'WebP to SVG Converter — free, private, no upload',
    accept: '.webp,image/webp',
    inputLabel: 'WebP',
    intro: [
      'WebP is everywhere on the modern web — and almost useless for print, cutting or engraving, because design and machine software wants vectors. This converter traces a WebP image into a clean SVG, free, directly in your browser. Nothing is uploaded: the file never leaves your device. You get 10 free conversions a day, one file at a time, and the SVG you download has no watermark.',
      'Found a logo or graphic online that only exists as WebP? Saved your own artwork in WebP and now your Cricut, laser or print shop is asking for SVG? Drop the file in, check the traced preview side by side with the original, and download the vector. Flat colours become clean paths; transparent areas in the WebP stay transparent in the result.',
      'One honest note: WebP is a delivery format, so quality varies. A WebP that was heavily compressed will trace like any low-quality image. If you have the original PNG or a design file, that will always give the sharpest vector.',
      'Need the rest of the toolkit? The VectorNest Studio adds DXF for laser cutters and CNC machines, vector PDF, PNG exports up to 3x, batch conversion of up to 20 files, and presets for Cricut, Glowforge, xTool and Omtech — no daily limit.',
    ],
    faq: [
      { q: 'Why convert WebP to SVG at all?', a: 'WebP is a web delivery format. Cutting machines, lasers, print shops and design tools work with vectors. SVG is scalable, editable and machine-ready; WebP is none of those.' },
      { q: 'Is this converter free?', a: 'Yes — 10 conversions a day, clean SVG with no watermark, no signup. Paid plans add DXF/PDF export, batch conversion and remove the cap.' },
      { q: 'Is my WebP uploaded anywhere?', a: 'No. The trace runs in your browser on your device. Open the Network tab while converting and confirm it yourself.' },
      { q: 'The result looks soft — why?', a: 'Heavily compressed WebP files lose edge detail, and a tracer can only follow the edges it can see. A higher-quality source file gives a sharper vector.' },
      { q: 'Can I open the SVG in Cricut or LightBurn?', a: 'Yes, SVG opens in both. If your workflow needs DXF instead, the Studio exports DXF (R12) with presets for your machine.' },
    ],
  },
};

export const FREE_SLUGS = Object.keys(PAGES) as FreeSlug[];

export function isFreeSlug(s: string): s is FreeSlug {
  return s in PAGES;
}

export default function FreeTool({ slug }: { slug: FreeSlug }) {
  const page = PAGES[slug];
  const { planActive } = useAuth();
  const unlimited = planActive || isPaid();

  useEffect(() => {
    document.title = page.title;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', page.metaDescription);
  }, [page]);

  const others = FREE_SLUGS.filter((s) => s !== slug);

  return (
    <div className="container">
      <section className="hero" style={{ textAlign: 'left', paddingBottom: 8 }}>
        <h1>{page.h1}</h1>
        {page.intro.slice(0, 2).map((p, i) => <p key={i} className={i === 0 ? 'lead' : 'muted'}>{p}</p>)}
      </section>

      <AdSlot slot="top" />

      <FreeConverter accept={page.accept} inputLabel={page.inputLabel} unlimited={unlimited} />

      <AdSlot slot="bottom" />

      <section style={{ marginTop: 24 }}>
        {page.intro.slice(2).map((p, i) => <p key={i} className="muted">{p}</p>)}
      </section>

      <div className="card upsell-box" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Need DXF, batch, vector PDF — and no daily cap?</h3>
        <p className="muted">
          The free converter does one SVG at a time. VectorNest Studio converts up to 20 files at once and exports
          SVG, DXF (R12), vector PDF and PNG up to 3x, with presets for Cricut, Glowforge, xTool and Omtech.
          Still no uploads — everything runs in your browser.
        </p>
        <p>
          <a className="btn btn-primary" href="/activate">3-Day Pass — $3.99</a>{' '}
          <a className="btn" href="/activate">Lifetime — $79 once</a>{' '}
          <a className="btn" href="/app">Open the Studio</a>
        </p>
      </div>

      <h2>Frequently asked questions</h2>
      <div className="faq">
        {page.faq.map((f) => (
          <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
        ))}
      </div>

      <h2>More free converters</h2>
      <p className="free-links">
        {others.map((s) => (
          <a key={s} className="btn btn-sm" href={`/free/${s}`}>{PAGES[s].h1.split(' — ')[0]}</a>
        ))}
        {' '}<a className="btn btn-sm" href="/app">VectorNest Studio — all formats</a>
      </p>
    </div>
  );
}
