import {useEffect, useState} from 'react';
import {useRow} from 'tinybase/ui-react';
import {ITEMS_TABLE} from '../store.ts';
import type {AppStore} from '../store.ts';
import {loadImage, onImageChange} from '../imageStore.ts';

interface Props {
  rowId: string;
  store: AppStore;
  onEdit: (id: string) => void;
}

const KIND_ICON: Record<string, string> = {
  comic: '📚',
  book: '📖',
  dvd: '💿',
  game: '🎮',
};

export default function ItemCard({rowId, store, onEdit}: Props) {
  const row = useRow(ITEMS_TABLE, rowId);
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadImage(rowId).then((url) => { if (active) setThumb(url); }).catch(() => {});
    const unsub = onImageChange((id) => {
      if (id === rowId) {
        loadImage(rowId).then((url) => { if (active) setThumb(url); }).catch(() => {});
      }
    });
    return () => { active = false; unsub(); };
  }, [rowId]);

  const toggleRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    store.setCell(ITEMS_TABLE, rowId, 'read', row.read === 1 ? 0 : 1);
  };

  const isRead = row.read === 1;
  const kind = String(row.kind ?? 'comic');

  return (
    <article className="item-card" onClick={() => onEdit(rowId)} role="button" tabIndex={0}>
      {thumb && (
        <img src={thumb} alt="" className="item-card-thumb" aria-hidden />
      )}

      <div className="item-card-body">
        <div className="item-card-meta">
          <span className="item-kind-icon" title={kind}>{KIND_ICON[kind] ?? '📦'}</span>
          {row.series && <span className="item-series">{String(row.series)}</span>}
          {row.year ? <span className="item-year">{String(row.year)}</span> : null}
        </div>
        <h3 className="item-title">{String(row.title) || '(untitled)'}</h3>
      </div>

      <button
        className={`read-badge ${isRead ? 'read-badge--done' : 'read-badge--unread'}`}
        onClick={toggleRead}
        aria-label={isRead ? 'Mark unread' : 'Mark read'}
      >
        {isRead ? '✓' : '!'}
      </button>
    </article>
  );
}
