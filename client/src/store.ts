import {createMergeableStore} from 'tinybase';

export const ITEMS_TABLE = 'items';
export const COVERS_TABLE = 'covers';

export type ItemKind = 'comic' | 'book' | 'game' | 'dvd';

export interface Item {
  id: string;
  kind: ItemKind;
  title: string;
  series: string;
  year: number;
  read: number;         // 0 = unread/unplayed, 1 = read/played
  owned: number;        // 0 = wishlist, 1 = owned
  notes: string;
  acquiredDate: string; // ISO date string "YYYY-MM-DD"
  pricePaid: number;
  language: string;
}

export function createAppStore() {
  const store = createMergeableStore();

  store.setTablesSchema({
    [ITEMS_TABLE]: {
      id:          {type: 'string', default: ''},
      kind:        {type: 'string', default: 'comic'},
      title:       {type: 'string', default: ''},
      series:      {type: 'string', default: ''},
      year:        {type: 'number', default: 0},
      read:        {type: 'number', default: 0},
      owned:       {type: 'number', default: 1},
      notes:       {type: 'string', default: ''},
      acquiredDate:{type: 'string', default: ''},
      pricePaid:   {type: 'number', default: 0},
      language:    {type: 'string', default: 'English'},
    },
    // Cover images, keyed by item id. Kept in its own table (not on the item row)
    // so a cover write doesn't churn the items list, and the base64 data syncs to
    // the server / other devices along with everything else in this store.
    [COVERS_TABLE]: {
      data: {type: 'string', default: ''}, // compressed JPEG data URL
    },
  });

  store.setValuesSchema({
    userName: {type: 'string', default: 'Collector'},
    currency: {type: 'string', default: 'DKK'},
  });

  return store;
}

export type AppStore = ReturnType<typeof createAppStore>;
