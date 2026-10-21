import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import {
  PRESETS, getPreset, traceImageData, loadImageFile, loadImageUrl,
  validateFile, type PresetId, type TraceOptions, type LoadedImage,
} from '../lib/tracer';
import { cleanSvg, countPaths } from '../lib/svgExport';
import { svgToDxf, type DxfUnit } from '../lib/dxfExport';
import { pdfToBlob } from '../lib/pdfExport';
import { svgToPngBlob, cappedScale } from '../lib/pngExport';
import { downloadBlob, downloadText, baseName } from '../lib/download';
import { freeRemaining, consumeFreeConversion } from '../lib/purchase';
import { useAuth } from '../lib/auth';

interface QueueItem {
  id: string;
  file: File;
  name: string;
  objectUrl: string;
  loaded: LoadedImage | null;
  status: 'queued' | 'loading' | 'tracing' | 'done' | 'error';
  svg: string | null;
  traceMs: number | null;
  pathCount: number | null;
  error: string | null;
  downscaled: boolean;
}

const SAMPLES = [
  { name: '06-vinyl-heart-banner.png', label: 'Sample: vinyl heart', url: '/samples/06-vinyl-heart-banner.png' },
  { name: '02-logo-coffee.png', label: 'Sample: coffee logo', url: '/samples/02-logo-coffee.png' },
  { name: '18-stencil-abc.png', label: 'Sample: stencil ABC', url: '/samples/18-stencil-abc.png' },
];

let idCounter = 0;
const nextId = () => `q${++idCounter}-${Date.now()}`;

export default function Studio({ paid, onPaidChange }: { paid: boolean; onPaidChange: (v: boolean) => void }) {
  // `paid` = effective access (active account plan OR guest device unlock).
  // The account plan details drive the badge text.
  const { plan, planActive, planExpiresAt } = useAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [presetId, setPresetId] = useState<PresetId>('laser-engrave');
  const [advanced, setAdvanced] = useState<TraceOptions>({ ...getPreset('laser-engrave').options });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<'side' | 'vector' | 'original'>('side');
  const [pngScale, setPngScale] = useState(2);
  const [pngBg, setPngBg] = useState<'transparent' | 'white'>('transparent');
  const [dxfUnit, setDxfUnit] = useState<DxfUnit>('mm');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const [freeLeft, setFreeLeft] = useState(freeRemaining());
  const cancelRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selected = queue.find((q) => q.id === selectedId) ?? null;
  // Preview must render the NORMALIZED svg (width + height + viewBox), not
  // the tracer's raw output (fixed width/height, no viewBox). Without a
  // viewBox the browser has no aspect ratio, so the max-width/max-height
  // CSS cannot scale the svg down — it renders at intrinsic pixel size,
  // overflows the pane, and only a clipped fragment ("half vectors") is
  // visible. cleanSvg is the same normalization the SVG export uses.
  const previewSvg = useMemo(() => (selected?.svg ? cleanSvg(selected.svg) : ''), [selected?.svg]);
  const patchItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }, []);

  const traceQueueItem = useCallback((item: QueueItem, opts: TraceOptions, paidNow: boolean) => {
    // Called after the item's image is loaded. Runs the (synchronous) trace
    // in a setTimeout so the "Tracing…" state paints first.
    if (!paidNow && freeRemaining() <= 0) {
      patchItem(item.id, { status: 'error', error: 'Free limit reached — 10 conversions a day. Get a 3-Day Pass ($3.99) or Lifetime ($79) for unlimited conversions.' });
      return;
    }
    patchItem(item.id, { status: 'tracing', error: null });
    setTimeout(() => {
      try {
        const loaded = item.loaded;
        if (!loaded) throw new Error('Image not loaded yet.');
        const result = traceImageData(loaded.imageData, opts);
        if (!paidNow) consumeFreeConversion();
        setFreeLeft(freeRemaining());
        patchItem(item.id, {
          status: 'done', svg: result.svg, traceMs: result.ms,
          pathCount: result.pathCount, error: null,
        });
      } catch (e) {
        patchItem(item.id, {
          status: 'error',
          error: e instanceof Error ? e.message : 'Tracing failed. Try the Posterize preset or a smaller, higher-contrast image.',
        });
      }
    }, 30);
  }, [patchItem]);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (queue.length + list.length > 20) {
      setError('Queue limit is 20 images. Remove some files first.');
      return;
    }
    setError(null);
    for (const file of list) {
      const problem = validateFile(file);
      if (problem) { setError(problem); continue; }
      const item: QueueItem = {
        id: nextId(), file, name: file.name,
        objectUrl: URL.createObjectURL(file), loaded: null,
        status: 'loading', svg: null, traceMs: null, pathCount: null,
        error: null, downscaled: false,
      };
      setQueue((prev) => [...prev, item]);
      setSelectedId(item.id);
      try {
        const loaded = await loadImageFile(file);
        patchItem(item.id, { loaded, status: 'queued', downscaled: loaded.downscaled });
        if (loaded.downscaled) {
          setNotice(`“${file.name}” was downscaled from ${loaded.originalWidth}×${loaded.originalHeight} to ${loaded.width}×${loaded.height} (4000px longest-edge limit).`);
        }
        traceQueueItem({ ...item, loaded }, advanced, paid);
      } catch (e) {
        patchItem(item.id, {
          status: 'error',
          error: e instanceof Error ? e.message : 'Could not decode this image.',
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length, advanced, paid, patchItem, traceQueueItem]);

  const addSample = async (sample: (typeof SAMPLES)[number]) => {
    setError(null);
    try {
      const { file, loaded } = await loadImageUrl(sample.url, sample.name);
      const item: QueueItem = {
        id: nextId(), file, name: sample.name, objectUrl: loaded.objectUrl,
        loaded, status: 'queued', svg: null, traceMs: null, pathCount: null,
        error: null, downscaled: loaded.downscaled,
      };
      setQueue((prev) => [...prev, item]);
      setSelectedId(item.id);
      traceQueueItem(item, advanced, paid);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sample could not be loaded.');
    }
  };

  const applyPreset = (id: PresetId) => {
    const preset = getPreset(id);
    setPresetId(id);
    setAdvanced({ ...preset.options });
    if (selected?.loaded && selected.status !== 'tracing') {
      traceQueueItem(selected, { ...preset.options }, paid);
    }
  };

  const applyAdvanced = (patch: Partial<TraceOptions>) => {
    setAdvanced((prev) => ({ ...prev, ...patch }));
  };

  const retraceSelected = () => {
    if (selected?.loaded) traceQueueItem(selected, advanced, paid);
  };

  const removeItem = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((q) => q.id === id);
      if (item) URL.revokeObjectURL(item.objectUrl);
      return prev.filter((q) => q.id !== id);
    });
    if (selectedId === id) setSelectedId(null);
  };

  const cancelBatch = () => { cancelRef.current = true; };

  const exportSvg = () => {
    if (!selected?.svg) return;
    // Free SVG is CLEAN — no watermark. Paid value is in DXF/PDF/batch/
    // larger PNG and no daily cap, not in degrading the SVG.
    downloadText(cleanSvg(selected.svg), `${baseName(selected.name)}-${presetId}.svg`, 'image/svg+xml');
  };

  const exportDxf = () => {
    if (!paid) { setError('DXF export is a paid feature. Get access to unlock it.'); return; }
    if (!selected?.svg) return;
    downloadText(svgToDxf(selected.svg, dxfUnit), `${baseName(selected.name)}-${presetId}.dxf`, 'application/dxf');
  };

  const exportPdf = () => {
    if (!paid) { setError('Vector PDF export is a paid feature. Get access to unlock it.'); return; }
    if (!selected?.svg) return;
    downloadBlob(pdfToBlob(selected.svg), `${baseName(selected.name)}-${presetId}.pdf`);
  };

  const exportPng = async () => {
    if (!selected?.svg) return;
    try {
      const scale = cappedScale(selected.svg, pngScale, paid);
      if (scale < pngScale) setNotice(`Free PNG is capped at 1024px on the longest edge — exported at ${scale.toFixed(2)}x. Get access for up to 3x.`);
      const blob = await svgToPngBlob(selected.svg, scale, pngBg);
      downloadBlob(blob, `${baseName(selected.name)}-${presetId}.png`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PNG export failed.');
    }
  };

  const exportBatchZip = async () => {
    if (!paid) { setError('Batch ZIP is a paid feature. Get access to unlock it.'); return; }
    if (queue.length === 0) return;
    cancelRef.current = false;
    setBatch({ done: 0, total: queue.length });
    const zip = new JSZip();
    let done = 0;
    for (const item of queue) {
      if (cancelRef.current) break;
      let svg = item.svg;
      if (!svg && item.loaded) {
        try {
          svg = traceImageData(item.loaded.imageData, advanced).svg;
          patchItem(item.id, { status: 'done', svg });
        } catch {
          patchItem(item.id, { status: 'error', error: 'Tracing failed during batch.' });
        }
      }
      if (svg) zip.file(`${baseName(item.name)}-${presetId}.svg`, cleanSvg(svg));
      done++;
      setBatch({ done, total: queue.length });
    }
    if (!cancelRef.current) {
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, 'vectornest-batch.zip');
    }
    setBatch(null);
  };

  // Keep the paid flag fresh if paid access changed in another tab.
  useEffect(() => {
    const onStorage = () => onPaidChange(freeRemaining() === Infinity);
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [onPaidChange]);

  const zoomPct = Math.round(zoom * 100);

  return (
    <div className="container studio-page">
      <div className="studio-head">
        <h1 style={{ margin: 0 }}>Studio</h1>
        {planActive && plan === 'lifetime'
          ? <span className="badge-paid">Lifetime — unlimited conversions</span>
          : planActive && plan === 'pass3'
            ? <span className="badge-paid">3-Day Pass — active{planExpiresAt ? ` until ${new Date(planExpiresAt).toLocaleString()}` : ''}</span>
            : paid
              ? <span className="badge-paid">Paid — unlimited conversions (this device)</span>
              : <span className="badge-free">{freeLeft === Infinity ? 'Paid' : `${freeLeft} free conversion${freeLeft === 1 ? '' : 's'} left today`}</span>}
      </div>
      <p className="muted">Everything runs in your browser. Nothing you drop here is uploaded.</p>

      {notice && <div className="notice" role="status">{notice} <button className="btn btn-sm" onClick={() => setNotice(null)}>Dismiss</button></div>}
      {error && <div className="error" role="alert">{error} <button className="btn btn-sm" onClick={() => setError(null)}>Dismiss</button></div>}

      <div className="studio">
        {/* Left: dropzone + queue */}
        <aside className="studio-col studio-col--left">
          <div
            className={`dropzone ${dragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); void addFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click(); }}
          >
            <strong>Drop PNG / JPG / WebP here</strong><br />
            or click to browse — up to 10 MB each, queue up to 20
          </div>
          <input
            ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            multiple hidden
            onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ''; }}
          />
          <h3>Queue ({queue.length}/20)</h3>
          {queue.length === 0 && <p className="muted small">No images yet. Try a sample below, or drop a logo in.</p>}
          {queue.map((q) => (
            <div key={q.id} className={`queue-item ${q.id === selectedId ? 'selected' : ''}`} onClick={() => setSelectedId(q.id)}>
              <img src={q.objectUrl} alt="" />
              <div className="meta">
                <div>{q.name}</div>
                <div className={`status ${q.status === 'done' ? 'done' : q.status === 'error' ? 'error' : q.status === 'tracing' || q.status === 'loading' ? 'busy' : ''}`}>
                  {q.status === 'done' ? `Done · ${q.pathCount} paths` : q.status === 'tracing' ? 'Tracing…' : q.status === 'loading' ? 'Loading…' : q.status === 'error' ? (q.error ?? 'Error') : 'Queued'}
                </div>
              </div>
              <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); removeItem(q.id); }}>✕</button>
            </div>
          ))}
          <h3>Try a sample</h3>
          <div className="sample-row">
            {SAMPLES.map((s) => (
              <button key={s.name} className="btn btn-sm" onClick={() => void addSample(s)}>{s.label}</button>
            ))}
          </div>
        </aside>

        {/* Center: preview */}
        <section className="studio-col studio-col--main preview-wrap">
          <div className="preview-head">
            <div>
              <button className={`btn btn-sm ${viewMode === 'side' ? 'btn-primary' : ''}`} onClick={() => setViewMode('side')}>Side by side</button>{' '}
              <button className={`btn btn-sm ${viewMode === 'original' ? 'btn-primary' : ''}`} onClick={() => setViewMode('original')}>Original</button>{' '}
              <button className={`btn btn-sm ${viewMode === 'vector' ? 'btn-primary' : ''}`} onClick={() => setViewMode('vector')}>Vector</button>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className="btn btn-sm" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}>−</button>
              <span className="small">{zoomPct}%</span>
              <button className="btn btn-sm" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>+</button>
              <input type="range" min={25} max={400} step={5} value={zoomPct} onChange={(e) => setZoom(Number(e.target.value) / 100)} aria-label="Zoom" />
            </div>
          </div>

          {!selected && (
            <div className="notice">
              <strong>Empty studio.</strong> Drop an image (or try a sample) and it traces automatically.
              Zoom to 400% — vectors stay sharp. Best inputs: clean, high-contrast logos and flat-colour designs. Not photos.
            </div>
          )}
          {selected?.status === 'tracing' && <div className="notice">Tracing “{selected.name}”… <button className="btn btn-sm" onClick={() => setSelectedId(selected.id)}>Keep waiting</button></div>}
          {selected?.status === 'error' && <div className="error">{selected.error} Try the Posterize preset or a smaller, higher-contrast image.</div>}
          {selected?.downscaled && <div className="notice small">Downscaled to 4000px longest edge before tracing.</div>}

          {selected && (viewMode === 'side' || viewMode === 'original') && (
            <div className={viewMode === 'side' ? 'preview-panes' : ''}>
              <div>
                <div className="pane-label">Original</div>
                <div className="pane"><img src={selected.objectUrl} alt="Original" className="scaled" style={{ transform: `scale(${zoom})`, maxWidth: '90%', maxHeight: '90%' }} /></div>
              </div>
              {viewMode === 'side' && (
                <div>
                  <div className="pane-label">Vector {selected.svg ? `· ${countPaths(selected.svg)} paths` : ''}</div>
                  <div className="pane">
                    {selected.svg
                      ? <div className="scaled svg-holder" style={{ transform: `scale(${zoom})` }} dangerouslySetInnerHTML={{ __html: previewSvg }} />
                      : <span className="muted small">{selected.status === 'tracing' ? 'Tracing…' : 'No trace yet'}</span>}
                  </div>
                </div>
              )}
            </div>
          )}
          {selected && viewMode === 'vector' && (
            <div>
              <div className="pane-label">Vector {selected.svg ? `· ${countPaths(selected.svg)} paths` : ''}</div>
              <div className="pane">
                {selected.svg
                  ? <div className="scaled svg-holder" style={{ transform: `scale(${zoom})` }} dangerouslySetInnerHTML={{ __html: previewSvg }} />
                  : <span className="muted small">{selected.status === 'tracing' ? 'Tracing…' : 'No trace yet'}</span>}
              </div>
            </div>
          )}
          {selected?.status === 'done' && (
            <p className="small muted" style={{ marginTop: 10 }}>
              Traced in {selected.traceMs?.toFixed(0)} ms · {selected.pathCount} paths · {selected.loaded?.width}×{selected.loaded?.height}px
            </p>
          )}
        </section>

        {/* Right: presets + exports */}
        <aside className="studio-col studio-col--side studio-panel">
          <h3 style={{ marginTop: 0 }}>Preset</h3>
          {PRESETS.map((p) => (
            <button key={p.id} className={`preset-btn ${presetId === p.id ? 'active' : ''}`} onClick={() => applyPreset(p.id)}>
              <strong>{p.label}</strong><span>{p.tagline}</span>
            </button>
          ))}
          <p className="small muted">{getPreset(presetId).bestFor}</p>

          <button className="btn btn-sm" onClick={() => setShowAdvanced((v) => !v)}>{showAdvanced ? 'Hide advanced' : 'Show advanced'}</button>
          {showAdvanced && (
            <div style={{ marginTop: 8 }}>
              <div className="slider-row"><label><span>Colours</span><span>{advanced.numberofcolors}</span></label>
                <input type="range" min={2} max={16} step={1} value={advanced.numberofcolors} onChange={(e) => applyAdvanced({ numberofcolors: Number(e.target.value) })} /></div>
              <div className="slider-row"><label><span>Denoise (pathomit)</span><span>{advanced.pathomit}</span></label>
                <input type="range" min={0} max={32} step={1} value={advanced.pathomit} onChange={(e) => applyAdvanced({ pathomit: Number(e.target.value) })} /></div>
              <div className="slider-row"><label><span>Line smoothing (ltres)</span><span>{advanced.ltres}</span></label>
                <input type="range" min={0} max={5} step={0.1} value={advanced.ltres} onChange={(e) => applyAdvanced({ ltres: Number(e.target.value) })} /></div>
              <div className="slider-row"><label><span>Curve smoothing (qtres)</span><span>{advanced.qtres}</span></label>
                <input type="range" min={0} max={5} step={0.1} value={advanced.qtres} onChange={(e) => applyAdvanced({ qtres: Number(e.target.value) })} /></div>
              <button className="btn btn-sm" onClick={retraceSelected} disabled={!selected?.loaded}>Re-trace with these settings</button>
            </div>
          )}

          <h3>Export</h3>
          <div className="export-grid">
            <button className="btn" onClick={exportSvg} disabled={!selected?.svg}>SVG</button>
            <button className="btn" onClick={exportDxf} disabled={!selected?.svg || !paid} title={paid ? '' : 'Paid feature'}>DXF {!paid && '🔒'}</button>
            <button className="btn" onClick={exportPdf} disabled={!selected?.svg || !paid} title={paid ? '' : 'Paid feature'}>PDF {!paid && '🔒'}</button>
            <button className="btn" onClick={() => void exportPng()} disabled={!selected?.svg}>PNG</button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <label className="small muted">PNG scale
              <select className="input" style={{ width: 90 }} value={pngScale} onChange={(e) => setPngScale(Number(e.target.value))}>
                <option value={1}>1x</option><option value={2}>2x</option><option value={3}>3x</option>
              </select>
            </label>
            <label className="small muted">PNG background
              <select className="input" style={{ width: 140 }} value={pngBg} onChange={(e) => setPngBg(e.target.value as 'transparent' | 'white')}>
                <option value="transparent">Transparent</option><option value="white">White</option>
              </select>
            </label>
            <label className="small muted">DXF units
              <select className="input" style={{ width: 90 }} value={dxfUnit} onChange={(e) => setDxfUnit(e.target.value as DxfUnit)}>
                <option value="mm">mm</option><option value="inch">inch</option><option value="px">px</option>
              </select>
            </label>
          </div>
          <p className="small muted">DXF units assume 96 DPI (1 px = 25.4/96 mm).</p>

          <h3>Batch</h3>
          {batch
            ? <div><div className="progress"><div style={{ width: `${(batch.done / batch.total) * 100}%` }} /></div><p className="small">{batch.done}/{batch.total} traced</p><button className="btn btn-sm" onClick={cancelBatch}>Cancel batch</button></div>
            : <button className="btn btn-block" onClick={() => void exportBatchZip()} disabled={queue.length === 0 || !paid} title={paid ? '' : 'Paid feature'}>Download batch ZIP (SVG){!paid && ' 🔒'}</button>}
          {!paid && <p className="small muted">DXF, PDF and batch ZIP need a plan. <a href="/activate">3-Day Pass $3.99 / Lifetime $79</a>.</p>}
        </aside>
      </div>
    </div>
  );
}
