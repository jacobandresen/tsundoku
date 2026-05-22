import {createWsSynchronizer} from 'tinybase/synchronizers/synchronizer-ws-client';
import type {AppStore} from './store.ts';

export type SyncStatus = 'connecting' | 'connected' | 'disconnected';

export interface SyncHandle {
  destroy: () => Promise<void>;
}

/**
 * Connect the app store to the TinyBase WsServer.
 *
 * Rejects immediately if the WebSocket errors before opening (server down,
 * wrong URL, etc.) so callers are never left awaiting indefinitely.
 */
export async function startSync(
  store: AppStore,
  onStatus: (status: SyncStatus) => void,
  wsUrl?: string,
): Promise<SyncHandle> {
  const url = wsUrl ?? deriveWsUrl();
  onStatus('connecting');

  const ws = new WebSocket(url);

  ws.addEventListener('open',  () => onStatus('connected'));
  ws.addEventListener('close', () => onStatus('disconnected'));
  ws.addEventListener('error', () => onStatus('disconnected'));

  // Race: reject as soon as the socket errors so we never hang on the await below.
  const errorRace = new Promise<never>((_, reject) => {
    ws.addEventListener('error', () => reject(new Error('WebSocket connection failed')));
    // Also reject if the socket closes before it ever opened (server refused)
    ws.addEventListener('close', (ev) => {
      if (ev.code !== 1000) reject(new Error(`WebSocket closed (${ev.code})`));
    });
  });

  const synchronizer = await Promise.race([
    createWsSynchronizer(store, ws),
    errorRace,
  ]);

  await synchronizer.startSync();

  return {
    destroy: async () => { synchronizer.destroy(); },
  };
}

function deriveWsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}`;
}
