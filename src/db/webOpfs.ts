import { Platform } from 'react-native';

interface OpfsDirectory {
  entries(): AsyncIterableIterator<[string, unknown]>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
}

/**
 * Web boot hygiene: the app uses a fresh session database per page load, so
 * leftover OPFS files from previous sessions are garbage. Old files also
 * exhaust the wa-sqlite access-handle pool, which breaks sqlite3_open.
 * Locked entries (another live tab) are skipped silently.
 */
export async function wipeWebDatabases(): Promise<void> {
  if (Platform.OS !== 'web') return;
  // An unload handler makes the page ineligible for Chrome's back/forward
  // cache. Without this, "dead" pages linger frozen with their SQLite worker
  // still holding OPFS access handles, which locks the pool for new sessions.
  (globalThis as { addEventListener?: (t: string, cb: () => void) => void }).addEventListener?.(
    'unload',
    () => {},
  );
  // Access OPFS through `unknown`: lib.dom's FileSystemDirectoryHandle type
  // doesn't expose the async-iterator `entries()` we rely on, so we describe
  // just the shape we use.
  const storage = (globalThis.navigator as { storage?: unknown })?.storage as
    | { getDirectory?: () => Promise<OpfsDirectory> }
    | undefined;
  if (!storage?.getDirectory) return;
  try {
    const root = await storage.getDirectory();
    for await (const [name] of root.entries()) {
      try {
        await root.removeEntry(name, { recursive: true });
      } catch {
        // Locked by a live tab — leave it.
      }
    }
  } catch {
    // OPFS unavailable — nothing to clean.
  }
}
