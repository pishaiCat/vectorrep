import { useRef, useState } from 'react';
import { loadImageFile, traceImageData, validateFile, type LoadedImage, type TraceOptions } from '../lib/tracer';
import { cleanSvg, countPaths } from '../lib/svgExport';
import { downloadText, baseName } from '../lib/download';
import { FREE_DAILY_LIMIT, consumeFreeConversion, freeRemaining } from '../lib/purchase';

/** Fixed, balanced trace settings for the free converter — deliberately
 *  NOT the machine presets (those are the paid Studio's job). */
const FREE_TRACE_OPTIONS: TraceOptions = {
  numberofcolors: 8,
  pathomit: 4,
  ltres: 1,
  qtres: 1,
  blurradius: 0,
  colorsampling: 2,
};

interface FreeConverterProps {
  /** File-picker accept attribute for this page (e.g. '.png,image/png'). */
  accept: string;
  /** Human label for the input format, e.g. 'PNG'. */
  inputLabel: string;
  /** True when the visitor has an active plan (or guest unlock) — then
   *  the daily counter does not apply. */
  unlimited: boolean;
}

/**
 * The free one-file-at-a-time converter used by the /free/* pages.
 * SVG download only, CLEAN output (no watermark), shared 10/day counter.
 * No queue, no presets, no DXF/PDF/PNG, no login.
 */
export default function FreeConverter({ accept, inputLabel, unlimited }: FreeConverterProps) {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [name, setName] = useState('');
  const [svg, setSvg] = useState<string | null>(null);
  const [pathCount, setPathCount] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'tracing' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [freeLeft, setFreeLeft] = useState(freeRemaining());
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const exhausted = !unlimited && freeLeft <= 0;

  const handleFile = async (file: File) => {
    setError(null);
    const problem = validateFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    if (!unlimited && freeRemaining() <= 0) {
      setFreeLeft(0);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    setSvg(null);
    setPathCount(null);
    try {
      const img = await loadImageFile(file);
      setLoaded(img);
      setName(file.name);
      setStatus('tracing');
      // Let the "Tracing…" state paint before the synchronous trace.
      setTimeout(() => {
        try {
          const result = traceImageData(img.imageData, FREE_TRACE_OPTIONS);
          if (!unlimited) consumeFreeConversion();
          setFreeLeft(freeRemaining());
          setSvg(result.svg);
          setPathCount(result.pathCount);
          setStatus('done');
        } catch {
          setStatus('error');
          setError('Tracing failed. Try a cleaner, higher-contrast image.');
        }
      }, 30);
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Could not decode this image.');
    }
  };

  const download = () => {
    if (!svg) return;
    downloadText(cleanSvg(svg), `${baseName(name) || 'vectornest'}.svg`, 'image/svg+xml');
  };

  return (
    <div className="free-converter">
      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) void handleFile(f); }}
        onClick={() => fileInputRef.current?.click()}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click(); }}
      >
        <strong>Drop your {inputLabel} here</strong><br />
        or click to browse — one file at a time, up to 10 MB
      </div>
      <input
        ref={fileInputRef} type="file" accept={accept} hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }}
      />

      <p className="small muted" style={{ marginTop: 8 }}>
        {unlimited
          ? 'You have an active plan — no daily limit here.'
          : `${Math.min(freeLeft, FREE_DAILY_LIMIT)} of ${FREE_DAILY_LIMIT} free conversions left today · Runs 100% in your browser — your image is never uploaded.`}
      </p>

      {error && <div className="error" role="alert">{error}</div>}
      {(status === 'loading' || status === 'tracing') && <div className="notice">Converting…</div>}

      {exhausted && status !== 'done' && (
        <div className="card upsell-box">
          <h3 style={{ marginTop: 0 }}>You&apos;ve used today&apos;s {FREE_DAILY_LIMIT} free conversions</h3>
          <p className="muted">Come back tomorrow — or skip the wait. The Studio adds DXF, vector PDF, PNG up to 3x, batch ZIP and machine presets (Cricut, Glowforge, xTool), with no daily cap.</p>
          <p>
            <a className="btn btn-primary" href="/activate">3-Day Pass — $3.99</a>{' '}
            <a className="btn" href="/activate">Lifetime — $79 once</a>{' '}
            <a className="btn" href="/app">Open the Studio</a>
          </p>
        </div>
      )}

      {loaded && (
        <div className="preview-panes" style={{ marginTop: 12 }}>
          <div>
            <div className="pane-label">Original</div>
            <div className="pane"><img src={loaded.objectUrl} alt="Original" style={{ maxWidth: '90%', maxHeight: '90%' }} /></div>
          </div>
          <div>
            <div className="pane-label">Vector {svg ? `· ${pathCount ?? countPaths(svg)} paths` : ''}</div>
            <div className="pane">
              {svg
                ? <div className="svg-holder" dangerouslySetInnerHTML={{ __html: cleanSvg(svg) }} />
                : <span className="muted small">{status === 'tracing' ? 'Converting…' : 'No result yet'}</span>}
            </div>
          </div>
        </div>
      )}

      {svg && status === 'done' && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={download}>Download SVG (free, no watermark)</button>
          <span className="small muted">Need DXF, PDF or batch? <a href="/app">The Studio does all of it</a>.</span>
        </div>
      )}
    </div>
  );
}
