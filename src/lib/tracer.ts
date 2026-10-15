/**
 * Tracing engine wrapper — MVP engine: ImageTracer (pure JS, client-side).
 *
 * ImageTracer (imagetracerjs@1.2.6, Unlicense / public domain) runs entirely
 * in the browser. It is NOT VTracer: its output is coarser than VTracer's,
 * especially on fine detail. The Phase 0 score of 19/20 was earned by the
 * official VTracer engine on SYNTHETIC images — never quote it for this MVP.
 *
 * VTracer web-WASM swap planned: the official @visioncortex/vtracer npm
 * build is Node-targeted (wasm-pack --target nodejs) and cannot run in a
 * Vite browser build. When a web-target build exists, swap the
 * implementation inside `traceImageData` only — every caller uses the
 * `TraceResult` / `TraceOptions` types below, not ImageTracer directly.
 */

import ImageTracer from 'imagetracerjs';
import type { ImageTracerOptions } from 'imagetracerjs';

export interface TraceOptions {
  /** Quantized colour count, 2–16. */
  numberofcolors: number;
  /** Discard paths shorter than this many points (denoise), 0–32. */
  pathomit: number;
  /** Line segment error threshold (smoothing), 0–5. Lower = more detail. */
  ltres: number;
  /** Quadratic spline error threshold (smoothing), 0–5. Lower = more detail. */
  qtres: number;
  /** Blur radius for denoise pre-pass, 0–5. */
  blurradius: number;
  /** 0 = deterministic palette, 2 = sampled palette. */
  colorsampling: number;
  /** Optional fixed palette (used by the B&W presets: black + white). */
  pal?: Array<{ r: number; g: number; b: number; a: number }>;
}

export interface TraceResult {
  svg: string;
  /** Wall-clock trace time in ms. */
  ms: number;
  /** Number of <path> elements in the SVG. */
  pathCount: number;
  width: number;
  height: number;
}

export type PresetId =
  | 'laser-engrave'
  | 'laser-cut'
  | 'cricut-vinyl'
  | 'stamp-stencil'
  | 'posterize';

export interface Preset {
  id: PresetId;
  label: string;
  tagline: string;
  bestFor: string;
  options: TraceOptions;
}

const BW_PALETTE = [
  { r: 0, g: 0, b: 0, a: 255 },
  { r: 255, g: 255, b: 255, a: 255 },
];

export const PRESETS: Preset[] = [
  {
    id: 'laser-engrave',
    label: 'Laser Engrave',
    tagline: 'Clean single-colour paths for engraving',
    bestFor: 'Logos & line art for Glowforge / xTool / Omtech engraving',
    options: {
      numberofcolors: 2, pathomit: 4, ltres: 1, qtres: 1,
      blurradius: 0, colorsampling: 0, pal: BW_PALETTE,
    },
  },
  {
    id: 'laser-cut',
    label: 'Laser Cut',
    tagline: 'Smoother outlines, heavier denoise',
    bestFor: 'Cut outlines — fewer nodes, cleaner weeding',
    options: {
      numberofcolors: 2, pathomit: 8, ltres: 1.5, qtres: 1.5,
      blurradius: 1, colorsampling: 0, pal: BW_PALETTE,
    },
  },
  {
    id: 'cricut-vinyl',
    label: 'Cricut Vinyl',
    tagline: 'Flat colours kept as separate layers',
    bestFor: 'Vinyl decals in Cricut Design Space / Silhouette Studio',
    options: {
      numberofcolors: 6, pathomit: 4, ltres: 1, qtres: 1,
      blurradius: 0, colorsampling: 2,
    },
  },
  {
    id: 'stamp-stencil',
    label: 'Stamp / Stencil',
    tagline: 'Bold shapes, heavy denoise',
    bestFor: 'Stamps, stencils and bold single-colour designs',
    options: {
      numberofcolors: 2, pathomit: 12, ltres: 2, qtres: 2,
      blurradius: 2, colorsampling: 0, pal: BW_PALETTE,
    },
  },
  {
    id: 'posterize',
    label: 'Posterize',
    tagline: 'Multi-colour artwork, up to 10 colours',
    bestFor: 'Colourful designs that need more than vinyl-flat colour',
    options: {
      numberofcolors: 10, pathomit: 4, ltres: 1, qtres: 1,
      blurradius: 0, colorsampling: 2,
    },
  },
];

export const DEFAULT_ADVANCED: TraceOptions = { ...PRESETS[0].options };

export function getPreset(id: PresetId): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

/** Trace an ImageData with the given options. Synchronous — run it off the
 *  main render path (Studio calls it inside a setTimeout so the UI paints
 *  the "Tracing…" state first). */
export function traceImageData(imageData: ImageData, options: TraceOptions): TraceResult {
  const started = performance.now();
  const itOptions: ImageTracerOptions = {
    ltres: options.ltres,
    qtres: options.qtres,
    pathomit: options.pathomit,
    numberofcolors: options.numberofcolors,
    colorsampling: options.colorsampling,
    colorquantcycles: 3,
    blurradius: options.blurradius,
    blurdelta: 20,
    scale: 1,
    roundcoords: 1,
    viewbox: false,
    desc: false,
    strokewidth: 0,
    linefilter: false,
    rightangleenhance: true,
    layering: 0,
    ...(options.pal ? { pal: options.pal } : {}),
  };
  const svg = ImageTracer.imagedataToSVG(imageData, itOptions);
  const ms = performance.now() - started;
  const pathCount = (svg.match(/<path /g) ?? []).length;
  return { svg, ms, pathCount, width: imageData.width, height: imageData.height };
}

export interface LoadedImage {
  imageData: ImageData;
  objectUrl: string;
  width: number;
  height: number;
  /** True when the image was downscaled from >4000px on its longest edge. */
  downscaled: boolean;
  originalWidth: number;
  originalHeight: number;
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_EDGE_PX = 4000;
export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `“${file.name}” is ${file.type || 'an unknown type'} — only PNG, JPG and WebP are supported.`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `“${file.name}” is ${(file.size / 1024 / 1024).toFixed(1)} MB — files must be 10 MB or smaller.`;
  }
  return null;
}

/** Decode a file to ImageData, honouring EXIF orientation (best-effort via
 *  createImageBitmap) and downscaling >4000px longest edge with a notice. */
export async function loadImageFile(file: File): Promise<LoadedImage> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const originalWidth = bitmap.width;
    const originalHeight = bitmap.height;
    const longest = Math.max(originalWidth, originalHeight);
    const scale = longest > MAX_EDGE_PX ? MAX_EDGE_PX / longest : 1;
    const width = Math.max(1, Math.round(originalWidth * scale));
    const height = Math.max(1, Math.round(originalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D is not available in this browser.');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const imageData = ctx.getImageData(0, 0, width, height);
    return { imageData, objectUrl, width, height, downscaled: scale < 1, originalWidth, originalHeight };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err instanceof Error ? err : new Error('Could not decode this image.');
  }
}

/** Decode an image fetched from a URL (used by the "Try a sample" buttons). */
export async function loadImageUrl(url: string, name: string): Promise<{ file: File; loaded: LoadedImage }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sample “${name}” could not be loaded.`);
  const blob = await res.blob();
  const file = new File([blob], name, { type: blob.type || 'image/png' });
  const loaded = await loadImageFile(file);
  return { file, loaded };
}
