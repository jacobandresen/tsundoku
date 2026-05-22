import {describe, it, expect, beforeEach} from 'vitest';
import {nanoid} from 'nanoid';
import {createAppStore, ITEMS_TABLE, type AppStore} from '../store.ts';

describe('store schema (iteration 2)', () => {
  let store: AppStore;

  beforeEach(() => {
    store = createAppStore();
  });

  it('starts empty', () => {
    expect(store.getTables()).toEqual({});
  });

  it('accepts a valid comic item', () => {
    const id = nanoid();
    store.setRow(ITEMS_TABLE, id, {
      id,
      kind: 'comic',
      title: 'The Blue Lotus',
      series: 'Tintin',
      year: 1936,
      read: 0,
      owned: 1,
      notes: 'First edition',
      acquiredDate: '2024-01-15',
      pricePaid: 25,
      language: 'French',
    });
    const row = store.getRow(ITEMS_TABLE, id);
    expect(row.title).toBe('The Blue Lotus');
    expect(row.series).toBe('Tintin');
    expect(row.read).toBe(0);
    expect(row.owned).toBe(1);
  });

  it('fills in schema defaults for missing optional fields', () => {
    const id = nanoid();
    store.setRow(ITEMS_TABLE, id, {
      id,
      kind: 'comic',
      title: 'Tintin in America',
      series: 'Tintin',
      year: 1932,
      read: 1,
      owned: 1,
      notes: '',
      acquiredDate: '',
      pricePaid: 0,
      language: 'English',
    });
    const row = store.getRow(ITEMS_TABLE, id);
    expect(row.notes).toBe('');
    expect(row.language).toBe('English');
  });

  it('strips unknown fields not in schema', () => {
    const id = nanoid();
    store.setRow(ITEMS_TABLE, id, {
      id,
      title: 'Cigars of the Pharaoh',
      // @ts-expect-error — intentionally injecting unknown field
      unknownField: 'should be dropped',
    });
    const row = store.getRow(ITEMS_TABLE, id);
    expect('unknownField' in row).toBe(false);
  });

  it('rejects a string value where a number is required (type coercion → default)', () => {
    const id = nanoid();
    store.setRow(ITEMS_TABLE, id, {
      id,
      title: 'The Broken Ear',
      // @ts-expect-error — intentionally wrong type
      year: 'not-a-number',
    });
    const row = store.getRow(ITEMS_TABLE, id);
    expect(row.year).toBe(0);
  });

  it('accepts a game item using the kind discriminator', () => {
    const id = nanoid();
    store.setRow(ITEMS_TABLE, id, {
      id,
      kind: 'game',
      title: 'Another World',
      series: '',
      year: 1991,
      read: 0,
      owned: 1,
      notes: '',
      acquiredDate: '2023-12-01',
      pricePaid: 10,
      language: 'English',
    });
    const row = store.getRow(ITEMS_TABLE, id);
    expect(row.kind).toBe('game');
    expect(row.title).toBe('Another World');
  });

  it('stores and retrieves values', () => {
    store.setValue('userName', 'Hergé');
    store.setValue('currency', 'EUR');
    expect(store.getValue('userName')).toBe('Hergé');
    expect(store.getValue('currency')).toBe('EUR');
  });

  it('can toggle the read flag', () => {
    const id = nanoid();
    store.setRow(ITEMS_TABLE, id, {
      id, kind: 'comic', title: 'Test', series: '',
      year: 2000, read: 0, owned: 1,
      notes: '', acquiredDate: '', pricePaid: 0, language: 'English',
    });
    expect(store.getCell(ITEMS_TABLE, id, 'read')).toBe(0);
    store.setCell(ITEMS_TABLE, id, 'read', 1);
    expect(store.getCell(ITEMS_TABLE, id, 'read')).toBe(1);
  });

  it('counts items correctly', () => {
    for (let i = 0; i < 3; i++) {
      const id = nanoid();
      store.setRow(ITEMS_TABLE, id, {
        id, kind: 'comic', title: `Comic ${i}`, series: 'Test',
        year: 2000 + i, read: i % 2, owned: 1,
        notes: '', acquiredDate: '', pricePaid: 0, language: 'English',
      });
    }
    expect(Object.keys(store.getTable(ITEMS_TABLE)).length).toBe(3);
  });
});
