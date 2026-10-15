/**
 * SVG → vector PDF (PDF 1.4, single page). Paid feature.
 *
 * Every SVG path is flattened to line segments and written as a PDF content
 * stream (`m` / `l` / `f`) with an `rg` fill colour per path. The result is
 * a real vector PDF (zoom stays sharp), not an embedded raster image.
 * Page size = SVG size converted from px (96 DPI) to points (72 DPI).
 * Y is flipped (PDF origin is bottom-left).
 */

import { extractSvgPaths, extractSvgSize } from './pathUtils';

function pdfEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function fmt(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** Build a complete, valid PDF document from an SVG string. */
export function svgToPdf(svg: string): string {
  const { width, height } = extractSvgSize(svg);
  const pageW = (width * 72) / 96;
  const pageH = (height * 72) / 96;
  const scale = 72 / 96;
  const paths = extractSvgPaths(svg);

  // Content stream: fill each flattened subpath.
  let content = '';
  for (const path of paths) {
    const [r, g, b] = path.fill ?? [0, 0, 0];
    content += `${fmt(r / 255)} ${fmt(g / 255)} ${fmt(b / 255)} rg\n`;
    for (const subpath of path.subpaths) {
      if (subpath.length < 2) continue;
      const pts = subpath.map((p) => ({ x: p.x * scale, y: (height - p.y) * scale }));
      content += `${fmt(pts[0].x)} ${fmt(pts[0].y)} m\n`;
      for (let i = 1; i < pts.length; i++) {
        content += `${fmt(pts[i].x)} ${fmt(pts[i].y)} l\n`;
      }
      content += path.closed ? 'h f\n' : 'f\n';
    }
  }
  if (!content) content = '0 0 0 rg\n0 0 m\n';

  const objects: string[] = [
    // 1: Catalog
    '<< /Type /Catalog /Pages 2 0 R >>',
    // 2: Pages
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    // 3: Page
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(pageW)} ${fmt(pageH)}] /Contents 4 0 R /Resources << >> >>`,
    // 4: Content stream (Length filled in below)
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
    // 5: Info
    `<< /Title (${pdfEscape('VectorNest export')}) /Producer (${pdfEscape('VectorNest')}) >>`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, idx) => {
    offsets.push(pdf.length);
    pdf += `${idx + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return pdf;
}

/** Convert the PDF string to a Blob (latin-1 bytes, matching the offsets). */
export function pdfToBlob(svg: string): Blob {
  const pdf = svgToPdf(svg);
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return new Blob([bytes.buffer], { type: 'application/pdf' });
}
