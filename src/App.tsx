import { useEffect, useState } from 'react';
import Landing from './pages/Landing';
import Studio from './pages/Studio';
import Benchmark from './pages/Benchmark';
import Activate from './pages/Activate';
import Legal from './pages/Legal';
import { isPaid, migrateLegacyLicense } from './lib/purchase';

export type Route = '' | 'app' | 'benchmark' | 'activate' | 'privacy' | 'terms' | 'license';

export function currentRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [base] = hash.split('?');
  if (['app', 'benchmark', 'activate', 'privacy', 'terms', 'license'].includes(base)) {
    return base as Route;
  }
  return '';
}

export default function App() {
  const [route, setRoute] = useState<Route>(currentRoute());
  const [paid, setPaid] = useState(isPaid());

  useEffect(() => {
    const onHash = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // One-time cleanup: drop any license-key data left by an earlier version.
  // Paid access is now a local flag set by /api/verify-purchase (no keys).
  useEffect(() => {
    migrateLegacyLicense();
  }, []);

  const nav = (label: string, href: string, active: boolean) => (
    <a key={href} href={href} className={active ? 'active' : ''}>{label}</a>
  );

  return (
    <>
      <header className="topnav">
        <a className="logo" href="#/">Vector<span>Nest</span></a>
        <nav>
          {nav('Studio', '#/app', route === 'app')}
          {nav('Benchmark', '#/benchmark', route === 'benchmark')}
          {nav('Get access', '#/activate', route === 'activate')}
          {nav('Privacy', '#/privacy', route === 'privacy')}
        </nav>
        <div className="spacer" />
        {paid ? (
          <span className="badge-paid">Paid — unlimited</span>
        ) : (
          <a className="btn btn-primary btn-sm" href="#/activate">Get VectorNest — $79</a>
        )}
      </header>
      <main>
        {route === '' && <Landing />}
        {route === 'app' && <Studio paid={paid} onPaidChange={setPaid} />}
        {route === 'benchmark' && <Benchmark />}
        {route === 'activate' && <Activate paid={paid} onPaidChange={setPaid} />}
        {(route === 'privacy' || route === 'terms' || route === 'license') && <Legal page={route} />}
      </main>
      <footer className="site">
        <span>VectorNest — MVP engine: ImageTracer (pure JS, client-side). VTracer web-WASM swap planned — official VTracer npm is Node-only.</span>
        <a href="#/privacy">Privacy</a>
        <a href="#/terms">Terms</a>
        <a href="#/license">License</a>
        <a href="#/benchmark">Benchmark</a>
      </footer>
    </>
  );
}
