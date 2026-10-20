import { useEffect, useState } from 'react';
import Landing from './pages/Landing';
import Studio from './pages/Studio';
import Benchmark from './pages/Benchmark';
import Activate from './pages/Activate';
import Legal from './pages/Legal';
import Account from './pages/Account';
import FreeTool, { isFreeSlug, type FreeSlug } from './pages/FreeTool';
import { AuthProvider, useAuth } from './lib/auth';
import { isPaid, migrateLegacyLicense } from './lib/purchase';

export type Route =
  | '' | 'app' | 'benchmark' | 'activate' | 'privacy' | 'terms' | 'license' | 'account'
  | 'free/png-to-svg' | 'free/jpg-to-svg' | 'free/image-to-vector' | 'free/webp-to-svg';

const STATIC_ROUTES = ['app', 'benchmark', 'activate', 'privacy', 'terms', 'license', 'account'];

export function currentRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [base] = hash.split('?');
  if (STATIC_ROUTES.includes(base)) return base as Route;
  if (isFreeSlug(base)) return `free/${base}` as Route;
  return '';
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function Shell() {
  const [route, setRoute] = useState<Route>(currentRoute());
  const [guestPaid, setGuestPaid] = useState(isPaid());
  const { plan, planActive } = useAuth();

  // Effective access: an active account plan (any device) OR the guest
  // device flag set right after a Creem checkout returns verified.
  const access = planActive || guestPaid;

  useEffect(() => {
    const onHash = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // One-time cleanup: drop any license-key data left by an earlier version.
  useEffect(() => {
    migrateLegacyLicense();
  }, []);

  const nav = (label: string, href: string, active: boolean) => (
    <a key={href} href={href} className={active ? 'active' : ''}>{label}</a>
  );

  const freeSlug: FreeSlug | null = route.startsWith('free/') && isFreeSlug(route.slice(5))
    ? (route.slice(5) as FreeSlug)
    : null;

  const headerBadge = planActive
    ? <span className="badge-paid">{plan === 'lifetime' ? 'Lifetime — unlimited' : '3-Day Pass — active'}</span>
    : guestPaid
      ? <span className="badge-paid">Paid — this device</span>
      : null;

  return (
    <>
      <header className="topnav">
        <a className="logo" href="#/">Vector<span>Nest</span></a>
        <nav>
          {nav('Studio', '#/app', route === 'app')}
          {nav('Free converter', '#/free/png-to-svg', route.startsWith('free/'))}
          {nav('Benchmark', '#/benchmark', route === 'benchmark')}
          {nav('Get access', '#/activate', route === 'activate')}
          {nav('Account', '#/account', route === 'account')}
          {nav('Privacy', '#/privacy', route === 'privacy')}
        </nav>
        <div className="spacer" />
        {headerBadge ?? (
          <a className="btn btn-primary btn-sm" href="#/activate">Get VectorNest — from $3.99</a>
        )}
      </header>
      <main>
        {route === '' && <Landing />}
        {route === 'app' && <Studio paid={access} onPaidChange={setGuestPaid} />}
        {route === 'benchmark' && <Benchmark />}
        {route === 'activate' && <Activate paid={access} onPaidChange={setGuestPaid} />}
        {route === 'account' && <Account />}
        {freeSlug && <FreeTool slug={freeSlug} />}
        {(route === 'privacy' || route === 'terms' || route === 'license') && <Legal page={route} />}
      </main>
      <footer className="site">
        <span>VectorNest — MVP engine: ImageTracer (pure JS, client-side). VTracer web-WASM swap planned — official VTracer npm is Node-only.</span>
        <a href="#/privacy">Privacy</a>
        <a href="#/terms">Terms</a>
        <a href="#/license">License</a>
        <a href="#/benchmark">Benchmark</a>
        <a href="mailto:muaviathegreat@gmail.com">Support: muaviathegreat@gmail.com</a>
      </footer>
    </>
  );
}
