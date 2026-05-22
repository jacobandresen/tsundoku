import {useSortedRowIds} from 'tinybase/ui-react';
import {useLocale} from '../LocaleContext.tsx';
import {ITEMS_TABLE} from '../store.ts';
import type {AppStore} from '../store.ts';
import ItemCard from './ItemCard.tsx';

export type Filter = 'all' | 'unread' | 'read' | 'wishlist';
export type KindFilter = 'all' | 'comic' | 'book' | 'dvd' | 'game';
export type SortKey = 'title' | 'year-desc' | 'year-asc' | 'acquired';

const SORT_CONFIG: Record<SortKey, {cell: string; desc: boolean}> = {
  'title':      {cell: 'title',       desc: false},
  'year-desc':  {cell: 'year',        desc: true},
  'year-asc':   {cell: 'year',        desc: false},
  'acquired':   {cell: 'acquiredDate', desc: true},
};

interface Props {
  store: AppStore;
  filter: Filter;
  kindFilter: KindFilter;
  sortBy: SortKey;
  search: string;
  onEdit: (id: string) => void;
}

export default function ItemList({store, filter, kindFilter, sortBy, search, onEdit}: Props) {
  const {strings} = useLocale();
  const {cell, desc} = SORT_CONFIG[sortBy];
  const allIds = useSortedRowIds(ITEMS_TABLE, cell, desc);

  const ids = allIds.filter((id) => {
    const row = store.getRow(ITEMS_TABLE, id);
    if (!row.title) return false;

    if (kindFilter !== 'all' && String(row.kind ?? 'comic') !== kindFilter) return false;

    if (search) {
      const q = search.toLowerCase();
      const matches =
        String(row.title).toLowerCase().includes(q) ||
        String(row.series).toLowerCase().includes(q);
      if (!matches) return false;
    }

    if (filter === 'unread') return row.owned === 1 && row.read === 0;
    if (filter === 'read') return row.owned === 1 && row.read === 1;
    if (filter === 'wishlist') return row.owned === 0;
    return true;
  });

  if (ids.length === 0) {
    return (
      <p className="placeholder">
        {search ? strings.noResults(search) : strings.noItems}
      </p>
    );
  }

  return (
    <ul className="item-list">
      {ids.map((id) => (
        <li key={id}>
          <ItemCard rowId={id} store={store} onEdit={onEdit} />
        </li>
      ))}
    </ul>
  );
}
