/**
 * SVG → PNG via canvas rasterization. Free tier: capped at 1024px on the
 * longest edge. Paid: up to 3x scale.
 */

import { extractSvgSize } from './pathUtils';

export const FREE_MAX_PNG_EDGE = 1024;

export async function svgToPngBlob(
  svg: string,
  scale: number,
  background: 'transparent' | 'white',
): Promise<Blob> {
  const { width, height } = extractSvgSize(svg);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available in this browser.');
  if (background === 'white') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not rasterize the SVG for PNG export.'));
      img.src = url;
    });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(url);
  }
  const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!out) throw new Error('PNG export failed.');
  return out;
}

/** Largest scale (from the requested one) that keeps the longest edge within
 *  the free-tier cap. Returns the effective scale. */
export function cappedScale(svg: string, requestedScale: number, paid: boolean): number {
  if (paid) return requestedScale;
  const { width, height } = extractSvgSize(svg);
  const longest = Math.max(width, height);
  return Math.min(requestedScale, FREE_MAX_PNG_EDGE / longest);
}
