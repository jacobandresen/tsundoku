import {useLocale} from '../LocaleContext.tsx';
import type {Locale} from '../i18n.ts';
import type {SyncStatus} from '../sync.ts';

interface Props {
  syncStatus: SyncStatus;
}

const STATUS_COLOR: Record<SyncStatus, string> = {
  connecting: 'var(--yellow)',
  connected: '#22c55e',
  disconnected: 'rgba(255,255,255,0.35)',
};

const LOCALES: {value: Locale; label: string}[] = [
  {value: 'en', label: 'EN'},
  {value: 'da', label: 'DA'},
  {value: 'ja', label: '日本語'},
];

export default function Header({syncStatus}: Props) {
  const {locale, setLocale, strings} = useLocale();

  return (
    <header className="header">
      <span className="header-logo" aria-hidden>🚀</span>
      <h1 className="header-title">Tsundoku</h1>
      <div className="header-right">
        <select
          className="locale-select"
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          aria-label="Language"
        >
          {LOCALES.map(({value, label}) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <span
          className="sync-dot"
          title={strings[`sync${syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1)}` as 'syncConnected']}
          style={{color: STATUS_COLOR[syncStatus]}}
          aria-hidden
        >
          ●
        </span>
      </div>
    </header>
  );
}
