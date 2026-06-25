// The one app-wide store instance and its persistence.
//
// Persisted to IndexedDB (not localStorage) because cover images now live in the
// store's `covers` table — base64 JPEGs would blow localStorage's ~5MB quota.
// IndexedDB has no such limit. The store syncs over WebSocket via startSync(),
// so covers reach the server and other devices for free.

import {createIndexedDbPersister} from 'tinybase/persisters/persister-indexed-db';
import {createLocalPersister} from 'tinybase/persisters/persister-browser';
import {createAppStore, ITEMS_TABLE} from './store.ts';

export const store = createAppStore();

/**
 * Load persisted data and start auto-saving. Resolves once the store is ready
 * to render. Call exactly once at startup.
 *
 * The persister is created here, not at module load, so that merely importing
 * the store (e.g. from imageStore.ts, or in tests) has no IndexedDB side effect.
 */
export async function initPersistence(): Promise<void> {
  const persister = createIndexedDbPersister(store, 'tsundoku-v1');
  await persister.startAutoLoad();

  // One-time migration: versions before cover-sync kept items in localStorage.
  // If IndexedDB is empty but the old localStorage store exists, fold it in.
  // (Covers lived in a separate IndexedDB, 'tsundoku-images', and are not
  // migrated — re-add them if needed; they'll sync from then on.)
  if (store.getRowCount(ITEMS_TABLE) === 0) {
    const legacy = createLocalPersister(store, 'tsundoku-v1');
    await legacy.load();
    await legacy.destroy();
  }

  await persister.startAutoSave();
}
