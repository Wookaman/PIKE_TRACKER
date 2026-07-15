import { Platform } from 'react-native';

/**
 * expo-sqlite's sync web driver needs a cross-origin-isolated page.
 * Returns 'ready' when the app may touch the database, or 'reloading' when a
 * service worker was just registered and the page is about to refresh.
 */
export function ensureWebIsolation(): 'ready' | 'reloading' {
  if (Platform.OS !== 'web') return 'ready';

  const g = globalThis as typeof globalThis & {
    crossOriginIsolated?: boolean;
    navigator?: Navigator;
    sessionStorage?: Storage;
    location?: Location;
  };

  if (g.crossOriginIsolated) return 'ready';
  if (!g.navigator || !('serviceWorker' in g.navigator)) return 'ready';

  const RELOAD_KEY = 'pike-coi-reload';
  if (g.sessionStorage?.getItem(RELOAD_KEY)) {
    // Already reloaded once and still not isolated — give up gating so the
    // real error surfaces instead of a reload loop.
    return 'ready';
  }

  g.navigator.serviceWorker
    .register('/coi-serviceworker.js')
    .then(() => {
      g.sessionStorage?.setItem(RELOAD_KEY, '1');
      g.location?.reload();
    })
    .catch(() => {});
  return 'reloading';
}
