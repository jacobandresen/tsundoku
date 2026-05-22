import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {WebSocketServer} from 'ws';
import {createWsServer} from 'tinybase/synchronizers/synchronizer-ws-server';
import {createWsSynchronizer} from 'tinybase/synchronizers/synchronizer-ws-client';
import {createMergeableStore} from 'tinybase';
import WebSocket from 'ws';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Iteration 3: WebSocket sync between two in-process clients through the WsServer.
// Also tests that createWsServer persists data to a file via createPersisterForPath.

describe('WebSocket sync (iteration 3)', () => {
  let wss: WebSocketServer;
  let wsServer: ReturnType<typeof createWsServer>;
  let port: number;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsundoku-test-'));

    wss = new WebSocketServer({port: 0}); // random free port
    await new Promise<void>((r) => wss.once('listening', r));
    port = (wss.address() as {port: number}).port;

    const {createFilePersister} = await import('tinybase/persisters/persister-file');

    wsServer = createWsServer(wss, (pathId) => {
      const safe = pathId.replace(/[^a-zA-Z0-9_-]/g, '-') || 'default';
      return createFilePersister(
        createMergeableStore(),
        path.join(tmpDir, `${safe}.json`),
      );
    });
  });

  afterAll(async () => {
    await wsServer.destroy();
    wss.close();
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  it('syncs a cell from client A to client B', async () => {
    const wsUrl = `ws://localhost:${port}`;

    // Client A
    const storeA = createMergeableStore();
    const syncA = await createWsSynchronizer(storeA, new WebSocket(wsUrl));
    await syncA.startSync();

    // Client B
    const storeB = createMergeableStore();
    const syncB = await createWsSynchronizer(storeB, new WebSocket(wsUrl));
    await syncB.startSync();

    // Write on A
    storeA.setCell('items', 'tintin-1', 'title', 'The Crab with the Golden Claws');

    // Wait for propagation
    await new Promise((r) => setTimeout(r, 150));

    // Verify on B
    expect(storeB.getCell('items', 'tintin-1', 'title')).toBe('The Crab with the Golden Claws');

    await syncA.destroy();
    await syncB.destroy();
  });

  it('persists synced data to a JSON file on the server', async () => {
    const wsUrl = `ws://localhost:${port}/collection`;

    const storeC = createMergeableStore();
    const syncC = await createWsSynchronizer(storeC, new WebSocket(wsUrl));
    await syncC.startSync();

    storeC.setCell('items', 'snowy-1', 'title', 'Snowy the Dog');

    // Wait for server persister to flush
    await new Promise((r) => setTimeout(r, 300));

    await syncC.destroy();

    const filePath = path.join(tmpDir, 'collection.json');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // The file contains TinyBase's internal JSON; verify it's non-empty
    expect(content).toBeTruthy();
  });
});
