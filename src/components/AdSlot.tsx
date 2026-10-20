import { useEffect, useRef } from 'react';
import { ADS } from '../config/ads';

/**
 * One ad slot on the free converter pages. Renders nothing unless ads
 * are enabled in src/config/ads.ts AND this slot has code pasted in.
 *
 * Adsterra codes are usually <script> tags, and scripts inserted via
 * innerHTML do not execute — so after setting the HTML we re-create
 * any <script> elements as fresh nodes, which the browser then runs.
 */
export default function AdSlot({ slot }: { slot: 'top' | 'bottom' }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const code = slot === 'top' ? ADS.topBanner : ADS.bottomBanner;
  const active = ADS.enabled && Boolean(code.trim());

  useEffect(() => {
    if (!active || !ref.current) return;
    const container = ref.current;
    container.innerHTML = code;
    container.querySelectorAll('script').forEach((old) => {
      const fresh = document.createElement('script');
      Array.from(old.attributes).forEach((attr) => fresh.setAttribute(attr.name, attr.value));
      fresh.text = old.text;
      old.replaceWith(fresh);
    });
    return () => {
      container.innerHTML = '';
    };
  }, [active, code]);

  if (!active) return null;
  return <div className="ad-slot" aria-label="Advertisement" ref={ref} />;
}
