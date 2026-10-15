/**
 * Shared SVG path-data parsing + curve flattening, used by the DXF and PDF
 * exporters. Pure functions, no DOM — covered by the node smoke test.
 */

export type Pt = { x: number; y: number };

export interface ParsedPath {
  /** Fill colour as [r, g, b] in 0–255, or null for no fill. */
  fill: [number, number, number] | null;
  /** Flattened polylines (one per subpath). */
  subpaths: Pt[][];
  /** True when the path is closed (ends with Z). */
  closed: boolean;
}

/** Parse an SVG `d` attribute into absolute-coordinate drawing commands. */
export function parsePathData(d: string): Array<{ cmd: string; pts: number[] }> {
  const tokens = d.match(/[MLHVCSQTAZmlhvcsqtaz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const out: Array<{ cmd: string; pts: number[] }> = [];
  let i = 0;
  let current: string | null = null;
  const argCount: Record<string, number> = {
    M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0,
  };
  while (i < tokens.length) {
    const tok = tokens[i];
    if (/^[MLHVCSQTAZmlhvcsqtaz]$/.test(tok)) {
      current = tok;
      i++;
      if (current.toUpperCase() === 'Z') {
        out.push({ cmd: current, pts: [] });
        current = null;
      }
      continue;
    }
    if (!current) { i++; continue; }
    const need = argCount[current.toUpperCase()];
    const nums: number[] = [];
    while (i < tokens.length && nums.length < need && !/^[MLHVCSQTAZmlhvcsqtaz]$/.test(tokens[i])) {
      nums.push(parseFloat(tokens[i]));
      i++;
    }
    if (nums.length === need) {
      out.push({ cmd: current, pts: nums });
      // Implicit lineto after the first moveto pair.
      if (current === 'M') current = 'L';
      if (current === 'm') current = 'l';
    } else {
      break;
    }
  }
  return out;
}

function cubicAt(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u ** 3 * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t ** 3 * p3.x,
    y: u ** 3 * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t ** 3 * p3.y,
  };
}

function quadAt(p0: Pt, p1: Pt, p2: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

/** Flatten parsed commands into polylines. Curves are subdivided until the
 *  deviation is below `tolerance` (default 0.5px, per the DXF spec). */
export function flattenCommands(
  commands: Array<{ cmd: string; pts: number[] }>,
  tolerance = 0.5,
): Pt[][] {
  const subpaths: Pt[][] = [];
  let current: Pt[] = [];
  let cursor: Pt = { x: 0, y: 0 };
  let start: Pt = { x: 0, y: 0 };
  let prevCubicCtrl: Pt | null = null;
  let prevQuadCtrl: Pt | null = null;

  const pushLine = (p: Pt) => {
    if (current.length === 0 || current[current.length - 1].x !== p.x || current[current.length - 1].y !== p.y) {
      current.push({ ...p });
    }
    cursor = { ...p };
  };
  const pushCurve = (points: Pt[]) => {
    for (const p of points) pushLine(p);
  };
  const subdivide = (
    sample: (t: number) => Pt,
    p0: Pt,
    pEnd: Pt,
  ) => {
    // Adaptive subdivision: double segments until the midpoint deviation is small.
    let n = 4;
    for (let iter = 0; iter < 5; iter++) {
      let maxDev = 0;
      for (let k = 1; k < n; k++) {
        const t = k / n;
        const pt = sample(t);
        const lx = p0.x + (pEnd.x - p0.x) * t;
        const ly = p0.y + (pEnd.y - p0.y) * t;
        maxDev = Math.max(maxDev, Math.hypot(pt.x - lx, pt.y - ly));
      }
      if (maxDev <= tolerance) break;
      n *= 2;
    }
    const pts: Pt[] = [];
    for (let k = 1; k <= n; k++) pts.push(sample(k / n));
    return pts;
  };

  for (const { cmd, pts } of commands) {
    const rel = cmd === cmd.toLowerCase() && cmd !== 'z';
    const up = cmd.toUpperCase();
    const at = (idx: number): Pt => ({
      x: (rel ? cursor.x : 0) + pts[idx],
      y: (rel ? cursor.y : 0) + pts[idx + 1],
    });
    switch (up) {
      case 'M': {
        if (current.length > 0) subpaths.push(current);
        current = [];
        const p = at(0);
        current.push({ ...p });
        cursor = { ...p };
        start = { ...p };
        prevCubicCtrl = null;
        prevQuadCtrl = null;
        break;
      }
      case 'L': pushLine(at(0)); prevCubicCtrl = null; prevQuadCtrl = null; break;
      case 'H': pushLine({ x: (rel ? cursor.x : 0) + pts[0], y: cursor.y }); prevCubicCtrl = null; prevQuadCtrl = null; break;
      case 'V': pushLine({ x: cursor.x, y: (rel ? cursor.y : 0) + pts[0] }); prevCubicCtrl = null; prevQuadCtrl = null; break;
      case 'C': {
        const p1 = at(0); const p2 = at(2); const p3 = at(4);
        pushCurve(subdivide((t) => cubicAt(cursor, p1, p2, p3, t), cursor, p3));
        prevCubicCtrl = p2;
        prevQuadCtrl = null;
        break;
      }
      case 'S': {
        const p1: Pt = prevCubicCtrl
          ? { x: 2 * cursor.x - prevCubicCtrl.x, y: 2 * cursor.y - prevCubicCtrl.y }
          : { ...cursor };
        const p2 = at(0); const p3 = at(2);
        pushCurve(subdivide((t) => cubicAt(cursor, p1, p2, p3, t), cursor, p3));
        prevCubicCtrl = p2;
        prevQuadCtrl = null;
        break;
      }
      case 'Q': {
        const p1 = at(0); const p2 = at(2);
        pushCurve(subdivide((t) => quadAt(cursor, p1, p2, t), cursor, p2));
        prevQuadCtrl = p1;
        prevCubicCtrl = null;
        break;
      }
      case 'T': {
        const p1: Pt = prevQuadCtrl
          ? { x: 2 * cursor.x - prevQuadCtrl.x, y: 2 * cursor.y - prevQuadCtrl.y }
          : { ...cursor };
        const p2 = at(0);
        pushCurve(subdivide((t) => quadAt(cursor, p1, p2, t), cursor, p2));
        prevQuadCtrl = p1;
        prevCubicCtrl = null;
        break;
      }
      case 'A': {
        // Elliptical arcs: sample along the arc. Endpoint-parameterisation.
        const rx = Math.abs(pts[0]); const ry = Math.abs(pts[1]);
        const phi = (pts[2] * Math.PI) / 180;
        const largeArc = pts[3]; const sweep = pts[4];
        const end = at(5);
        if (rx === 0 || ry === 0) { pushLine(end); break; }
        const cosPhi = Math.cos(phi); const sinPhi = Math.sin(phi);
        const dx = (cursor.x - end.x) / 2; const dy = (cursor.y - end.y) / 2;
        const x1p = cosPhi * dx + sinPhi * dy;
        const y1p = -sinPhi * dx + cosPhi * dy;
        let lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
        let rxs = rx; let rys = ry;
        if (lam > 1) { const s = Math.sqrt(lam); rxs *= s; rys *= s; }
        const num = rxs * rxs * rys * rys - rxs * rxs * y1p * y1p - rys * rys * x1p * x1p;
        const den = rxs * rxs * y1p * y1p + rys * rys * x1p * x1p;
        const co = Math.sqrt(Math.max(0, num / den)) * (largeArc === sweep ? -1 : 1);
        const cxp = (co * rxs * y1p) / rys;
        const cyp = (-co * rys * x1p) / rxs;
        const cx = cosPhi * cxp - sinPhi * cyp + (cursor.x + end.x) / 2;
        const cy = sinPhi * cxp + cosPhi * cyp + (cursor.y + end.y) / 2;
        const angle = (ux: number, uy: number, vx: number, vy: number) => {
          const dot = ux * vx + uy * vy;
          const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
          let a = Math.acos(Math.max(-1, Math.min(1, dot / len)));
          if (ux * vy - uy * vx < 0) a = -a;
          return a;
        };
        const theta1 = angle(1, 0, (x1p - cxp) / rxs, (y1p - cyp) / rys);
        let dTheta = angle((x1p - cxp) / rxs, (y1p - cyp) / rys, (-x1p - cxp) / rxs, (-y1p - cyp) / rys);
        if (!sweep && dTheta > 0) dTheta -= 2 * Math.PI;
        if (sweep && dTheta < 0) dTheta += 2 * Math.PI;
        const n = Math.max(4, Math.ceil(Math.abs(dTheta) / (Math.PI / 16)));
        const arcPts: Pt[] = [];
        for (let k = 1; k <= n; k++) {
          const t = theta1 + (dTheta * k) / n;
          arcPts.push({
            x: cx + rxs * Math.cos(t) * cosPhi - rys * Math.sin(t) * sinPhi,
            y: cy + rxs * Math.cos(t) * sinPhi + rys * Math.sin(t) * cosPhi,
          });
        }
        pushCurve(arcPts);
        prevCubicCtrl = null;
        prevQuadCtrl = null;
        break;
      }
      case 'Z': {
        pushLine(start);
        if (current.length > 0) subpaths.push(current);
        current = [];
        cursor = { ...start };
        prevCubicCtrl = null;
        prevQuadCtrl = null;
        break;
      }
      default: break;
    }
  }
  if (current.length > 0) subpaths.push(current);
  return subpaths;
}

/** Parse an `rgb(r,g,b)` / `#rrggbb` / colour-name fill into [r,g,b]. */
export function parseFill(fill: string | null | undefined): [number, number, number] | null {
  if (!fill || fill === 'none' || fill === 'transparent') return null;
  const rgb = fill.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  const hex = fill.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const v = parseInt(hex[1], 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  const short = fill.match(/^#([0-9a-f]{3})$/i);
  if (short) {
    const h = short[1];
    return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
  }
  if (fill.toLowerCase() === 'black') return [0, 0, 0];
  if (fill.toLowerCase() === 'white') return [255, 255, 255];
  return null;
}

/** Extract every <path> (d + fill) from an SVG string. */
export function extractSvgPaths(svg: string): ParsedPath[] {
  const out: ParsedPath[] = [];
  const pathRe = /<path\b[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = pathRe.exec(svg)) !== null) {
    const tag = m[0];
    const d = tag.match(/\bd="([^"]*)"/)?.[1];
    if (!d) continue;
    const fill = tag.match(/\bfill="([^"]*)"/)?.[1] ?? null;
    const commands = parsePathData(d);
    const subpaths = flattenCommands(commands, 0.5);
    const closed = /\bZ\b/i.test(d);
    out.push({ fill: parseFill(fill), subpaths, closed });
  }
  return out;
}

/** Read width/height/viewBox from an SVG root element. */
export function extractSvgSize(svg: string): { width: number; height: number } {
  const root = svg.match(/<svg\b[^>]*>/)?.[0] ?? '';
  const num = (re: RegExp) => {
    const v = root.match(re)?.[1];
    return v ? parseFloat(v) : NaN;
  };
  let width = num(/\bwidth="([\d.]+)/);
  let height = num(/\bheight="([\d.]+)/);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    const vb = root.match(/viewBox="([\d.\s-]+)"/)?.[1]?.trim().split(/\s+/).map(Number);
    if (vb && vb.length === 4) {
      width = vb[2];
      height = vb[3];
    }
  }
  return {
    width: Number.isFinite(width) && width > 0 ? width : 100,
    height: Number.isFinite(height) && height > 0 ? height : 100,
  };
}
