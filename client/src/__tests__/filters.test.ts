import {describe, it, expect, beforeEach} from 'vitest';
import {nanoid} from 'nanoid';
import {createAppStore, ITEMS_TABLE} from '../store.ts';
import type {AppStore} from '../store.ts';

function addItem(store: AppStore, overrides: Record<string, unknown>) {
  const id = nanoid();
  store.setRow(ITEMS_TABLE, id, {
    id,
    kind: 'comic',
    title: 'Default Title',
    series: '',
    year: 2000,
    read: 0,
    owned: 1,
    notes: '',
    acquiredDate: '',
    pricePaid: 0,
    language: 'English',
    ...overrides,
  });
  return id;
}

// Mirrors the filter logic in ItemList.tsx
function filterItems(
  store: AppStore,
  filter: 'all' | 'unread' | 'read' | 'wishlist',
  kindFilter: 'all' | 'comic' | 'book' | 'dvd' | 'game' = 'all',
  search = '',
): string[] {
  const table = store.getTable(ITEMS_TABLE);
  return Object.entries(table)
    .filter(([_, row]) => {
      if (kindFilter !== 'all' && String(row.kind ?? 'comic') !== kindFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !String(row.title).toLowerCase().includes(q) &&
          !String(row.series).toLowerCase().includes(q)
        ) return false;
      }
      if (filter === 'unread') return row.owned === 1 && row.read === 0;
      if (filter === 'read')   return row.owned === 1 && row.read === 1;
      if (filter === 'wishlist') return row.owned === 0;
      return true;
    })
    .map(([id]) => id);
}

describe('status filter', () => {
  let store: AppStore;
  beforeEach(() => { store = createAppStore(); });

  it('all returns every item', () => {
    addItem(store, {title: 'A', owned: 1, read: 1});
    addItem(store, {title: 'B', owned: 1, read: 0});
    addItem(store, {title: 'C', owned: 0, read: 0});
    expect(filterItems(store, 'all').length).toBe(3);
  });

  it('unread returns owned & unread only', () => {
    addItem(store, {title: 'Read',     owned: 1, read: 1});
    addItem(store, {title: 'Unread',   owned: 1, read: 0});
    addItem(store, {title: 'Wishlist', owned: 0, read: 0});
    const ids = filterItems(store, 'unread');
    expect(ids.length).toBe(1);
    expect(store.getCell(ITEMS_TABLE, ids[0], 'title')).toBe('Unread');
  });

  it('read returns owned & read only', () => {
    addItem(store, {title: 'Read',   owned: 1, read: 1});
    addItem(store, {title: 'Unread', owned: 1, read: 0});
    const ids = filterItems(store, 'read');
    expect(ids.length).toBe(1);
    expect(store.getCell(ITEMS_TABLE, ids[0], 'title')).toBe('Read');
  });

  it('wishlist returns un-owned items', () => {
    addItem(store, {title: 'Owned',    owned: 1});
    addItem(store, {title: 'Wishlist', owned: 0});
    const ids = filterItems(store, 'wishlist');
    expect(ids.length).toBe(1);
    expect(store.getCell(ITEMS_TABLE, ids[0], 'title')).toBe('Wishlist');
  });
});

describe('kind filter', () => {
  let store: AppStore;
  beforeEach(() => { store = createAppStore(); });

  it('kindFilter=all returns every kind', () => {
    addItem(store, {kind: 'comic', title: 'Tintin'});
    addItem(store, {kind: 'game',  title: 'Doom'});
    addItem(store, {kind: 'dvd',   title: 'Alien'});
    expect(filterItems(store, 'all', 'all').length).toBe(3);
  });

  it('kindFilter=comic returns only comics', () => {
    addItem(store, {kind: 'comic', title: 'Tintin'});
    addItem(store, {kind: 'game',  title: 'Doom'});
    addItem(store, {kind: 'book',  title: 'Dune'});
    const ids = filterItems(store, 'all', 'comic');
    expect(ids.length).toBe(1);
    expect(store.getCell(ITEMS_TABLE, ids[0], 'title')).toBe('Tintin');
  });

  it('kindFilter=dvd returns only DVDs', () => {
    addItem(store, {kind: 'comic', title: 'Tintin'});
    addItem(store, {kind: 'dvd',   title: 'Alien'});
    addItem(store, {kind: 'dvd',   title: 'Blade Runner'});
    const ids = filterItems(store, 'all', 'dvd');
    expect(ids.length).toBe(2);
  });

  it('kind filter and status filter combine', () => {
    addItem(store, {kind: 'game', title: 'Played game',   read: 1, owned: 1});
    addItem(store, {kind: 'game', title: 'Unplayed game', read: 0, owned: 1});
    addItem(store, {kind: 'comic', title: 'Unread comic', read: 0, owned: 1});
    // Games + unplayed → only the unplayed game
    const ids = filterItems(store, 'unread', 'game');
    expect(ids.length).toBe(1);
    expect(store.getCell(ITEMS_TABLE, ids[0], 'title')).toBe('Unplayed game');
  });

  it('kind filter + search combine', () => {
    addItem(store, {kind: 'comic', title: 'Tintin comic'});
    addItem(store, {kind: 'book',  title: 'Tintin book'});
    // Searching "tintin" inside comics only
    const ids = filterItems(store, 'all', 'comic', 'tintin');
    expect(ids.length).toBe(1);
    expect(store.getCell(ITEMS_TABLE, ids[0], 'title')).toBe('Tintin comic');
  });
});

describe('sort', () => {
  let store: AppStore;
  beforeEach(() => { store = createAppStore(); });

  function sortedTitles(
    s: AppStore,
    cell: 'title' | 'year' | 'acquiredDate',
    desc: boolean,
  ): string[] {
    const table = s.getTable(ITEMS_TABLE);
    return Object.values(table)
      .sort((a, b) => {
        const av = a[cell] ?? '';
        const bv = b[cell] ?? '';
        if (av < bv) return desc ? 1 : -1;
        if (av > bv) return desc ? -1 : 1;
        return 0;
      })
      .map((r) => String(r.title));
  }

  it('title A–Z', () => {
    addItem(store, {title: 'Tintin', year: 1930});
    addItem(store, {title: 'Asterix', year: 1959});
    addItem(store, {title: 'Blake', year: 1970});
    expect(sortedTitles(store, 'title', false)).toEqual(['Asterix', 'Blake', 'Tintin']);
  });

  it('year newest first', () => {
    addItem(store, {title: 'A', year: 1930});
    addItem(store, {title: 'B', year: 1959});
    addItem(store, {title: 'C', year: 1970});
    expect(sortedTitles(store, 'year', true)).toEqual(['C', 'B', 'A']);
  });

  it('year oldest first', () => {
    addItem(store, {title: 'A', year: 1930});
    addItem(store, {title: 'B', year: 1959});
    addItem(store, {title: 'C', year: 1970});
    expect(sortedTitles(store, 'year', false)).toEqual(['A', 'B', 'C']);
  });

  it('acquiredDate newest first', () => {
    addItem(store, {title: 'Old',    acquiredDate: '2020-01-01'});
    addItem(store, {title: 'Recent', acquiredDate: '2024-06-15'});
    addItem(store, {title: 'Mid',    acquiredDate: '2022-03-10'});
    expect(sortedTitles(store, 'acquiredDate', true)).toEqual(['Recent', 'Mid', 'Old']);
  });
});

describe('search', () => {
  let store: AppStore;
  beforeEach(() => { store = createAppStore(); });

  it('matches title case-insensitively', () => {
    addItem(store, {title: 'The Blue Lotus', series: 'Tintin'});
    addItem(store, {title: 'Asterix',        series: 'Asterix'});
    expect(filterItems(store, 'all', 'all', 'BLUE').length).toBe(1);
  });

  it('matches series', () => {
    addItem(store, {title: 'The Crab with the Golden Claws', series: 'Tintin'});
    addItem(store, {title: 'Asterix the Gaul',               series: 'Asterix'});
    expect(filterItems(store, 'all', 'all', 'tintin').length).toBe(1);
  });

  it('no match returns empty', () => {
    addItem(store, {title: 'Something'});
    expect(filterItems(store, 'all', 'all', 'zzznomatch').length).toBe(0);
  });
});
