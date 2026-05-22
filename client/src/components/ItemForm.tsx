import {useState} from 'react';
import {nanoid} from 'nanoid';
import {useLocale} from '../LocaleContext.tsx';
import {getKindVerbs} from '../kindMeta.ts';
import {ITEMS_TABLE} from '../store.ts';
import type {AppStore, Item, ItemKind} from '../store.ts';
import {deleteImage} from '../imageStore.ts';
import ImagePicker from './ImagePicker.tsx';

interface Props {
  store: AppStore;
  editId?: string | null;
  onClose: () => void;
}

function blankItem(): Omit<Item, 'id'> {
  return {
    kind: 'comic',
    title: '',
    series: '',
    year: new Date().getFullYear(),
    read: 0,
    owned: 1,
    notes: '',
    acquiredDate: new Date().toISOString().slice(0, 10),
    pricePaid: 0,
    language: 'English',
  };
}

export default function ItemForm({store, editId, onClose}: Props) {
  const {locale, strings} = useLocale();
  const existing = editId ? store.getRow(ITEMS_TABLE, editId) : null;

  // Stable item ID so images can be saved before the form is submitted.
  const [itemId] = useState(() => editId ?? nanoid());

  const [form, setForm] = useState<Omit<Item, 'id'>>(() =>
    existing
      ? {
          kind: (existing.kind as ItemKind) ?? 'comic',
          title: String(existing.title ?? ''),
          series: String(existing.series ?? ''),
          year: Number(existing.year ?? new Date().getFullYear()),
          read: Number(existing.read ?? 0),
          owned: Number(existing.owned ?? 1),
          notes: String(existing.notes ?? ''),
          acquiredDate: String(existing.acquiredDate ?? ''),
          pricePaid: Number(existing.pricePaid ?? 0),
          language: String(existing.language ?? 'English'),
        }
      : blankItem(),
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({...prev, [key]: value}));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = strings.titleRequired;
    if (form.year < 1800 || form.year > 2100) e.year = strings.yearInvalid;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    store.setRow(ITEMS_TABLE, itemId, {...form, id: itemId});
    onClose();
  };

  const handleDelete = () => {
    if (!editId) return;
    if (confirm(strings.confirmDelete)) {
      deleteImage(editId).catch(() => {});
      store.delRow(ITEMS_TABLE, editId);
      onClose();
    }
  };

  const readLabel = getKindVerbs(form.kind, locale).formDone;

  const KIND_OPTIONS: {value: ItemKind; label: string}[] = [
    {value: 'comic', label: strings.labelComic},
    {value: 'book',  label: strings.labelBook},
    {value: 'dvd',   label: strings.labelDvd},
    {value: 'game',  label: strings.labelGame},
  ];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{editId ? strings.editItem : strings.addItemTitle}</h2>
          <button className="modal-close" onClick={onClose} aria-label={strings.cancel}>✕</button>
        </div>

        <form className="item-form" onSubmit={handleSubmit}>
          {/* Photo */}
          <div className="form-row">
            <ImagePicker itemId={itemId} />
          </div>

          {/* Kind */}
          <div className="form-row">
            <label className="form-label">{strings.labelType}</label>
            <div className="toggle-group">
              {KIND_OPTIONS.map(({value, label}) => (
                <button
                  key={value}
                  type="button"
                  className={`toggle-btn ${form.kind === value ? 'toggle-btn--active' : ''}`}
                  onClick={() => set('kind', value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Ownership */}
          <div className="form-row">
            <label className="form-label">{strings.labelStatus}</label>
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn ${form.owned === 1 ? 'toggle-btn--active' : ''}`}
                onClick={() => set('owned', 1)}
              >
                {strings.labelOwned}
              </button>
              <button
                type="button"
                className={`toggle-btn ${form.owned === 0 ? 'toggle-btn--active' : ''}`}
                onClick={() => set('owned', 0)}
              >
                {strings.labelWishlist}
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="form-row">
            <label className="form-label" htmlFor="f-title">{strings.labelTitle} *</label>
            <input
              id="f-title"
              className={`form-input ${errors.title ? 'form-input--error' : ''}`}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. The Blue Lotus"
              autoFocus
            />
            {errors.title && <span className="form-error">{errors.title}</span>}
          </div>

          {/* Series and Year */}
          <div className="form-row form-row--half">
            <div>
              <label className="form-label" htmlFor="f-series">{strings.labelSeries}</label>
              <input
                id="f-series"
                className="form-input"
                value={form.series}
                onChange={(e) => set('series', e.target.value)}
                placeholder="e.g. Tintin"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="f-year">{strings.labelYear}</label>
              <input
                id="f-year"
                className={`form-input ${errors.year ? 'form-input--error' : ''}`}
                type="number"
                value={form.year}
                onChange={(e) => set('year', parseInt(e.target.value, 10) || 0)}
                min={1800}
                max={2100}
              />
              {errors.year && <span className="form-error">{errors.year}</span>}
            </div>
          </div>

          {/* Read / Played toggle */}
          <div className="form-row form-row--switch">
            <label className="form-label">{readLabel}</label>
            <label className="switch">
              <input
                type="checkbox"
                checked={form.read === 1}
                onChange={(e) => set('read', e.target.checked ? 1 : 0)}
              />
              <span className="switch-track" />
            </label>
          </div>

          {/* Language */}
          <div className="form-row">
            <label className="form-label" htmlFor="f-lang">{strings.labelLanguage}</label>
            <input
              id="f-lang"
              className="form-input"
              value={form.language}
              onChange={(e) => set('language', e.target.value)}
              placeholder="English"
            />
          </div>

          {/* Price and Acquired date */}
          <div className="form-row form-row--half">
            <div>
              <label className="form-label" htmlFor="f-price">{strings.labelPrice}</label>
              <input
                id="f-price"
                className="form-input"
                type="number"
                value={form.pricePaid}
                onChange={(e) => set('pricePaid', parseFloat(e.target.value) || 0)}
                min={0}
                step="0.01"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="f-date">{strings.labelAcquired}</label>
              <input
                id="f-date"
                className="form-input"
                type="date"
                value={form.acquiredDate}
                onChange={(e) => set('acquiredDate', e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="form-row">
            <label className="form-label" htmlFor="f-notes">{strings.labelNotes}</label>
            <textarea
              id="f-notes"
              className="form-input form-textarea"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="First edition, signed copy, etc."
            />
          </div>

          <div className="form-actions">
            {editId && (
              <button type="button" className="btn btn--danger" onClick={handleDelete}>
                {strings.delete}
              </button>
            )}
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              {strings.cancel}
            </button>
            <button type="submit" className="btn btn--primary">
              {editId ? strings.save : strings.addItem}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
