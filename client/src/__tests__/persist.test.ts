import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {nanoid} from 'nanoid';
import {createLocalPersister} from 'tinybase/persisters/persister-browser';
import {createAppStore, ITEMS_TABLE} from '../store.ts';

// Minimal localStorage mock for jsdom environments
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem:    (k: string) => mockStorage[k] ?? null,
  setItem:    (k: string, v: string) => { mockStorage[k] = v; },
  removeItem: (k: string) => { delete mockStorage[k]; },
  clear:      () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
  get length() { return Object.keys(mockStorage).length; },
  key: (i: number) => Object.keys(mockStorage)[i] ?? null,
};

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {value: localStorageMock, configurable: true});
  localStorageMock.clear();
});

afterEach(() => {
  localStorageMock.clear();
});

describe('localStorage persistence (iteration 5)', () => {
  it('saves an item and retrieves it after a simulated reload', async () => {
    const KEY = 'tsundoku-persist-test';

    // --- "Session 1": write data and persist it ---
    const store1 = createAppStore();
    const persister1 = createLocalPersister(store1, KEY);
    await persister1.startAutoSave();

    const id = nanoid();
    store1.setRow(ITEMS_TABLE, id, {
      id,
      kind: 'comic',
      title: 'The Blue Lotus',
      series: 'Tintin',
      year: 1936,
      read: 0,
      owned: 1,
      notes: '',
      acquiredDate: '2024-01-15',
      pricePaid: 25,
      language: 'French',
    });

    // Give the auto-save a tick to flush
    await new Promise((r) => setTimeout(r, 20));
    await persister1.destroy();

    // Confirm something was actually stored
    expect(localStorage.getItem(KEY)).not.toBeNull();

    // --- "Session 2": fresh store loads from the same key ---
    const store2 = createAppStore();
    const persister2 = createLocalPersister(store2, KEY);
    await persister2.startAutoLoad();

    expect(store2.getCell(ITEMS_TABLE, id, 'title')).toBe('The Blue Lotus');
    expect(store2.getCell(ITEMS_TABLE, id, 'series')).toBe('Tintin');
    expect(store2.getCell(ITEMS_TABLE, id, 'year')).toBe(1936);
    expect(store2.getCell(ITEMS_TABLE, id, 'read')).toBe(0);

    await persister2.destroy();
  });

  it('persists a read-status toggle', async () => {
    const KEY = 'tsundoku-persist-toggle-test';

    const store1 = createAppStore();
    const persister1 = createLocalPersister(store1, KEY);
    await persister1.startAutoSave();

    const id = nanoid();
    store1.setRow(ITEMS_TABLE, id, {
      id, kind: 'book', title: 'Dune', series: '',
      year: 1965, read: 0, owned: 1, notes: '', acquiredDate: '', pricePaid: 0, language: 'English',
    });

    // Toggle to read
    store1.setCell(ITEMS_TABLE, id, 'read', 1);
    await new Promise((r) => setTimeout(r, 20));
    await persister1.destroy();

    // Reload
    const store2 = createAppStore();
    const persister2 = createLocalPersister(store2, KEY);
    await persister2.startAutoLoad();

    expect(store2.getCell(ITEMS_TABLE, id, 'read')).toBe(1);
    await persister2.destroy();
  });

  it('starts empty when nothing has been persisted', async () => {
    const KEY = 'tsundoku-persist-empty-test';
    const store = createAppStore();
    const persister = createLocalPersister(store, KEY);
    await persister.startAutoLoad();
    expect(store.getTables()).toEqual({});
    await persister.destroy();
  });
});
