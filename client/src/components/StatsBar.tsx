import {useTable} from 'tinybase/ui-react';
import {useLocale} from '../LocaleContext.tsx';
import {getKindVerbs} from '../kindMeta.ts';
import {ITEMS_TABLE} from '../store.ts';
import type {KindFilter} from './ItemList.tsx';

interface Props {
  kindFilter: KindFilter;
}

export default function StatsBar({kindFilter}: Props) {
  const {locale, strings} = useLocale();
  const items = useTable(ITEMS_TABLE);
  const allRows = Object.values(items);

  // Scope to the active kind filter
  const rows = kindFilter === 'all'
    ? allRows
    : allRows.filter((r) => String(r.kind ?? 'comic') === kindFilter);

  const owned = rows.filter((r) => r.owned === 1);
  const done  = owned.filter((r) => r.read === 1);
  const pct   = owned.length ? Math.round((done.length / owned.length) * 100) : 0;

  // Use kind-specific verbs when a single kind is selected or dominant
  const activeKind = kindFilter !== 'all'
    ? kindFilter
    : (Object.entries(
        owned.reduce<Record<string, number>>((acc, r) => {
          const k = String(r.kind ?? 'comic');
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {})
      ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'comic');

  const verbs = getKindVerbs(activeKind, locale);
  const uniqueKinds = new Set(owned.map((r) => String(r.kind ?? 'comic')));
  const isSingleKind = kindFilter !== 'all' || uniqueKinds.size === 1;

  const doneLabel    = isSingleKind ? verbs.done    : strings.statsRead;
  const notDoneLabel = isSingleKind ? verbs.notDone : strings.statsUnread;

  return (
    <div className="stats-bar">
      <span className="stat">
        <strong>{owned.length}</strong> {strings.statsOwned}
      </span>
      <span className="stat-divider">·</span>
      <span className="stat">
        <strong>{done.length}</strong> {doneLabel}
      </span>
      <span className="stat-divider">·</span>
      <span className="stat">
        <strong>{owned.length - done.length}</strong> {notDoneLabel}
      </span>
      <span className="stat-divider">·</span>
      <span className="stat stat-pct" style={{color: pct === 100 ? '#22c55e' : 'var(--yellow)'}}>
        <strong>{pct}%</strong> {strings.statsDone}
      </span>
    </div>
  );
}
