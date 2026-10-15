/**
 * SVG → DXF (R12, POLYLINE entities). Paid feature.
 *
 * Path `d` data is flattened to polylines at ~0.5px tolerance, then written
 * as R12 POLYLINE/VERTEX/SEQEND entities — the most universally readable
 * DXF flavour for laser/CNC software (LightBurn, RDWorks, etc.).
 *
 * Units: SVG user units are pixels. DXF values are scaled assuming 96 DPI
 * (1 px = 25.4/96 mm = 1/96 inch). Y is flipped (DXF is Y-up, SVG is
 * Y-down) so the design is not mirrored in the target app.
 */

import { extractSvgPaths, extractSvgSize } from './pathUtils';

export type DxfUnit = 'mm' | 'inch' | 'px';

const UNIT_SCALE: Record<DxfUnit, number> = {
  mm: 25.4 / 96,
  inch: 1 / 96,
  px: 1,
};

function fmt(n: number): string {
  // Trim to 4 decimals to keep files small without losing cut precision.
  return String(Math.round(n * 10000) / 10000);
}

export function svgToDxf(svg: string, unit: DxfUnit = 'mm'): string {
  const { height } = extractSvgSize(svg);
  const scale = UNIT_SCALE[unit];
  const paths = extractSvgPaths(svg);
  const lines: string[] = [];
  const push = (...codes: Array<[string, string]>) => {
    for (const [code, value] of codes) lines.push(code, value);
  };

  // HEADER — minimal R12 header with unit declaration.
  push(['0', 'SECTION'], ['2', 'HEADER'], ['9', '$ACADVER'], ['1', 'AC1009']);
  push(['9', '$INSUNITS'], ['70', unit === 'mm' ? '4' : unit === 'inch' ? '1' : '0']);
  push(['0', 'ENDSEC']);

  // TABLES — a single default layer so readers never choke on a missing table.
  push(
    ['0', 'SECTION'], ['2', 'TABLES'],
    ['0', 'TABLE'], ['2', 'LAYER'], ['70', '1'],
    ['0', 'LAYER'], ['2', '0'], ['70', '0'], ['62', '7'], ['6', 'Continuous'],
    ['0', 'ENDTAB'],
    ['0', 'ENDSEC'],
  );

  // ENTITIES — one POLYLINE per subpath.
  push(['0', 'SECTION'], ['2', 'ENTITIES']);
  for (const path of paths) {
    for (const subpath of path.subpaths) {
      if (subpath.length < 2) continue;
      const closed = path.closed ? 1 : 0;
      push(
        ['0', 'POLYLINE'],
        ['8', '0'],
        ['66', '1'],
        ['70', String(closed)],
      );
      for (const pt of subpath) {
        push(
          ['0', 'VERTEX'],
          ['8', '0'],
          ['10', fmt(pt.x * scale)],
          ['20', fmt((height - pt.y) * scale)],
          ['30', '0'],
        );
      }
      push(['0', 'SEQEND'], ['8', '0']);
    }
  }
  push(['0', 'ENDSEC'], ['0', 'EOF']);
  return lines.join('\n') + '\n';
}
