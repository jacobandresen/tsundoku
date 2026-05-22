import {useEffect, useRef, useState} from 'react';
import {Provider, useTable} from 'tinybase/ui-react';
import {createLocalPersister} from 'tinybase/persisters/persister-browser';
import {createAppStore, ITEMS_TABLE} from './store.ts';
import {startSync} from './sync.ts';
import type {SyncStatus} from './sync.ts';
import {useLocale} from './LocaleContext.tsx';
import {getKindVerbs} from './kindMeta.ts';
import Header from './components/Header.tsx';
import StatsBar from './components/StatsBar.tsx';
import ItemList from './components/ItemList.tsx';
import type {Filter, KindFilter, SortKey} from './components/ItemList.tsx';
import ItemForm from './components/ItemForm.tsx';

const store = createAppStore();

const KIND_ICON: Record<string, string> = {
  comic: '📚',
  book:  '📖',
  dvd:   '💿',
  game:  '🎮',
};

// Preferred display order for kind chips
const KIND_ORDER: KindFilter[] = ['comic', 'book', 'dvd', 'game'];

function AppInner() {
  const {locale, strings} = useLocale();
  const [filter,     setFilter]     = useState<Filter>('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [sortBy,     setSortBy]     = useState<SortKey>('title');
  const [search,     setSearch]     = useState('');
  const [editId,     setEditId]     = useState<string | null>(null);
  const [showForm,   setShowForm]   = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('disconnected');
  const syncHandle = useRef<Awaited<ReturnType<typeof startSync>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const persister = createLocalPersister(store, 'tsundoku-v1');
      await persister.startAutoLoad();
      await persister.startAutoSave();
      if (cancelled) return;
      try {
        const handle = await startSync(store, setSyncStatus);
        if (cancelled) handle.destroy();
        else syncHandle.current = handle;
      } catch {
        if (!cancelled) setSyncStatus('disconnected');
      }
    }
    init();
    return () => { cancelled = true; syncHandle.current?.destroy(); };
  }, []);

  // Collect which kinds actually exist in the collection (for chip visibility)
  const items = useTable(ITEMS_TABLE);
  const rows  = Object.values(items);
  const presentKinds = new Set(rows.map((r) => String(r.kind ?? 'comic')));

  // For read-status tab labels: scope to the active kind if one is selected
  const scopedRows   = kindFilter === 'all' ? rows : rows.filter((r) => String(r.kind ?? 'comic') === kindFilter);
  const uniqueScoped = new Set(scopedRows.map((r) => String(r.kind ?? 'comic')));
  const dominantKind = kindFilter !== 'all'
    ? kindFilter
    : (Object.entries(
        scopedRows.reduce<Record<string, number>>((acc, r) => {
          const k = String(r.kind ?? 'comic');
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {})
      ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'comic');

  const verbs       = getKindVerbs(dominantKind, locale);
  const isSingleKind = kindFilter !== 'all' || uniqueScoped.size === 1;
  const doneLabel    = isSingleKind ? verbs.filterDone    : strings.filterRead;
  const notDoneLabel = isSingleKind ? verbs.filterNotDone : strings.filterUnread;

  const STATUS_LABELS: Record<Filter, string> = {
    all:      strings.filterAll,
    unread:   notDoneLabel,
    read:     doneLabel,
    wishlist: strings.filterWishlist,
  };

  // Kind chips — only show kinds that are in the collection; always show "All"
  const visibleKinds = KIND_ORDER.filter((k) => presentKinds.has(k));

  return (
    <div className="app">
      <Header syncStatus={syncStatus} />

      <div className="search-bar">
        <input
          className="search-input"
          type="search"
          placeholder={strings.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          aria-label="Sort order"
        >
          <option value="title">{strings.sortTitle}</option>
          <option value="year-desc">{strings.sortYearNewest}</option>
          <option value="year-asc">{strings.sortYearOldest}</option>
          <option value="acquired">{strings.sortAcquired}</option>
        </select>
      </div>

      {/* Kind filter chips — hidden when collection has only one kind */}
      {visibleKinds.length > 1 && (
        <div className="kind-chips">
          <button
            className={`kind-chip ${kindFilter === 'all' ? 'kind-chip--active' : ''}`}
            onClick={() => setKindFilter('all')}
          >
            {strings.filterAll}
          </button>
          {visibleKinds.map((k) => (
            <button
              key={k}
              className={`kind-chip ${kindFilter === k ? 'kind-chip--active' : ''}`}
              onClick={() => setKindFilter(k)}
            >
              {KIND_ICON[k]} {k.charAt(0).toUpperCase() + k.slice(1)}s
            </button>
          ))}
        </div>
      )}

      <StatsBar kindFilter={kindFilter} />

      <nav className="filter-tabs">
        {(['all', 'unread', 'read', 'wishlist'] as Filter[]).map((f) => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'filter-tab--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {STATUS_LABELS[f]}
          </button>
        ))}
      </nav>

      <main className="main">
        <ItemList
          store={store}
          filter={filter}
          kindFilter={kindFilter}
          sortBy={sortBy}
          search={search}
          onEdit={openEdit}
        />
      </main>

      <button className="fab" onClick={openAdd} aria-label={strings.addItem}>+</button>

      {showForm && (
        <ItemForm store={store} editId={editId} onClose={closeForm} />
      )}
    </div>
  );

  function openAdd()          { setEditId(null); setShowForm(true); }
  function openEdit(id: string) { setEditId(id);   setShowForm(true); }
  function closeForm()          { setShowForm(false); setEditId(null); }
}

export default function App() {
  const {strings} = useLocale();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const persister = createLocalPersister(store, 'tsundoku-v1');
    let active = true;
    persister.startAutoLoad().then(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  if (!ready) {
    return (
      <div className="app">
        <header className="header">
          <span className="header-logo" aria-hidden>🚀</span>
          <h1 className="header-title">Tsundoku</h1>
        </header>
        <main className="main">
          <p className="placeholder">{strings.loading}</p>
        </main>
      </div>
    );
  }

  return (
    <Provider store={store}>
      <AppInner />
    </Provider>
  );
}
