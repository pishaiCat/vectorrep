/**
 * Tiny path router helpers (History API — no hash routes).
 * navigateTo pushes a new path and notifies the app shell, which listens
 * for popstate, so route state updates without a page reload.
 */
export function navigateTo(path: string): void {
  if (window.location.pathname + window.location.search === path) return;
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}
