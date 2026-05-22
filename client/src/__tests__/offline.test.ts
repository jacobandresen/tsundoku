import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {nanoid} from 'nanoid';
import {createAppStore, ITEMS_TABLE} from '../store.ts';
import {startSync} from '../sync.ts';

// Iteration: client works without a server.

describe('offline / no-server behaviour', () => {
  describe('store is fully usable without sync', () => {
    it('can add and retrieve items with no server present', () => {
      const store = createAppStore();
      const id = nanoid();
      store.setRow(ITEMS_TABLE, id, {
        id, kind: 'comic', title: 'The Shooting Star', series: 'Tintin',
        year: 1942, read: 0, owned: 1, notes: '', acquiredDate: '', pricePaid: 0, language: 'French',
      });
      expect(store.getCell(ITEMS_TABLE, id, 'title')).toBe('The Shooting Star');
    });

    it('can toggle read status without a server', () => {
      const store = createAppStore();
      const id = nanoid();
      store.setRow(ITEMS_TABLE, id, {
        id, kind: 'book', title: 'Dune', series: '',
        year: 1965,
        read: 0, owned: 1, notes: '', acquiredDate: '', pricePaid: 0, language: 'English',
      });
      store.setCell(ITEMS_TABLE, id, 'read', 1);
      expect(store.getCell(ITEMS_TABLE, id, 'read')).toBe(1);
    });
  });

  describe('startSync rejects fast when server is unreachable', () => {
    let originalWebSocket: typeof WebSocket;

    beforeEach(() => {
      originalWebSocket = globalThis.WebSocket;
    });

    afterEach(() => {
      globalThis.WebSocket = originalWebSocket;
    });

    it('rejects within a reasonable time when the WebSocket errors', async () => {
      // Simulate a WebSocket that immediately fires an error (server down).
      globalThis.WebSocket = class MockWebSocket extends EventTarget {
        readyState = 3; // CLOSED
        close() {}
        constructor(_url: string) {
          super();
          // Fire error + close on the next tick (same as a refused connection).
          Promise.resolve().then(() => {
            this.dispatchEvent(new Event('error'));
            const closeEvent = Object.assign(new Event('close'), {code: 1006, wasClean: false});
            this.dispatchEvent(closeEvent);
          });
        }
      } as unknown as typeof WebSocket;

      const store = createAppStore();
      const statusUpdates: string[] = [];

      const start = Date.now();
      await expect(
        startSync(store, (s) => statusUpdates.push(s), 'ws://localhost:19999'),
      ).rejects.toThrow();
      const elapsed = Date.now() - start;

      // Must reject quickly — not hang for seconds
      expect(elapsed).toBeLessThan(2000);
      expect(statusUpdates).toContain('connecting');
      expect(statusUpdates).toContain('disconnected');
    });
  });
});
