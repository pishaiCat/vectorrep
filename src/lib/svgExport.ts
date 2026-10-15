/**
 * SVG cleanup + watermarking.
 * The tracer's raw SVG gets a normalized root (width/height/viewBox) and any
 * editor metadata stripped, so imports in LightBurn / Cricut Design Space /
 * Inkscape open at the correct scale.
 */

import { extractSvgSize } from './pathUtils';

export const WATERMARK_TEXT = 'VectorNest free preview — not for production';

export function countPaths(svg: string): number {
  return (svg.match(/<path /g) ?? []).length;
}

/** Normalize the SVG root: strip the tracer's desc metadata, set explicit
 *  width/height + viewBox. Returns the cleaned SVG string. */
export function cleanSvg(svg: string, width?: number, height?: number): string {
  const size = extractSvgSize(svg);
  const w = width ?? size.width;
  const h = height ?? size.height;
  const cleaned = svg
    .replace(/<svg\b[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`)
    .replace(/\sdesc="[^"]*"/, '');
  return cleaned;
}

/** Free-tier SVG: the clean SVG plus a small watermark <text> element in the
 *  bottom-left corner. Deliberately a plain element (not baked into paths)
 *  so buyers can see the true trace quality before paying. */
export function watermarkedSvg(svg: string): string {
  const size = extractSvgSize(svg);
  const clean = cleanSvg(svg, size.width, size.height);
  const fontSize = Math.max(10, Math.round(size.height * 0.025));
  const watermark =
    `<text x="8" y="${size.height - 8}" font-family="sans-serif" font-size="${fontSize}" ` +
    `fill="#888888" opacity="0.9">${WATERMARK_TEXT}</text>`;
  return clean.replace('</svg>', `${watermark}</svg>`);
}
