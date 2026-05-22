// Tsundoku — minimal i18n (Danish and Japanese; English fallback)
// Locale detection uses navigator.language; can be overridden via store value.

export type Locale = 'en' | 'da' | 'ja';

export interface Strings {
  addItem: string;
  searchPlaceholder: string;
  sortTitle: string;
  sortYearNewest: string;
  sortYearOldest: string;
  sortAcquired: string;
  filterAll: string;
  filterUnread: string;
  filterRead: string;
  filterWishlist: string;
  statsOwned: string;
  statsRead: string;
  statsUnread: string;
  statsDone: string;
  labelType: string;
  labelComic: string;
  labelBook: string;
  labelDvd: string;
  labelGame: string;
  labelStatus: string;
  labelOwned: string;
  labelWishlist: string;
  labelTitle: string;
  labelSeries: string;
  labelYear: string;
  labelLanguage: string;
  labelPrice: string;
  labelAcquired: string;
  labelNotes: string;
  editItem: string;
  addItemTitle: string;
  save: string;
  cancel: string;
  delete: string;
  confirmDelete: string;
  noItems: string;
  noResults: (q: string) => string;
  loading: string;
  syncConnecting: string;
  syncConnected: string;
  syncDisconnected: string;
  titleRequired: string;
  yearInvalid: string;
  scanTitle: string;
  scanning: string;
  scanTapLine: string;
  scanNoText: string;
  scanError: string;
}

const en: Strings = {
  addItem: 'Add item',
  searchPlaceholder: 'Search titles and series…',
  sortTitle: 'Title A–Z',
  sortYearNewest: 'Year: newest',
  sortYearOldest: 'Year: oldest',
  sortAcquired: 'Recently added',
  filterAll: 'All',
  filterUnread: 'Unread',
  filterRead: 'Read',
  filterWishlist: 'Wishlist',
  statsOwned: 'owned',
  statsRead: 'read',
  statsUnread: 'unread',
  statsDone: 'done',
  labelType: 'Type',
  labelComic: '📚 Comic',
  labelBook: '📖 Book',
  labelDvd: '💿 DVD',
  labelGame: '🎮 Game',
  labelStatus: 'Status',
  labelOwned: 'Owned',
  labelWishlist: 'Wishlist',
  labelTitle: 'Title',
  labelSeries: 'Series',
  labelYear: 'Year',
  labelLanguage: 'Language',
  labelPrice: 'Price Paid',
  labelAcquired: 'Acquired',
  labelNotes: 'Notes',
  editItem: 'Edit Item',
  addItemTitle: 'Add Item',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  confirmDelete: 'Delete this item?',
  noItems: 'Nothing here yet. Tap + to add an item.',
  noResults: (q) => `No results for "${q}"`,
  loading: 'Loading…',
  syncConnecting: 'Connecting',
  syncConnected: 'Connected',
  syncDisconnected: 'Offline',
  titleRequired: 'Title is required',
  yearInvalid: 'Enter a valid year',
  scanTitle: 'Scan title from cover',
  scanning: 'Scanning…',
  scanTapLine: 'Tap a line to use as the title',
  scanNoText: 'No text found — try a clearer photo',
  scanError: 'Scan failed — try again',
};

const da: Strings = {
  addItem: 'Tilføj',
  searchPlaceholder: 'Søg titler og serier…',
  sortTitle: 'Titel A–Å',
  sortYearNewest: 'År: nyeste',
  sortYearOldest: 'År: ældste',
  sortAcquired: 'Senest tilføjet',
  filterAll: 'Alle',
  filterUnread: 'Ulæst',
  filterRead: 'Læst',
  filterWishlist: 'Ønskeliste',
  statsOwned: 'ejet',
  statsRead: 'læst',
  statsUnread: 'ulæst',
  statsDone: 'færdig',
  labelType: 'Type',
  labelComic: '📚 Tegneserie',
  labelBook: '📖 Bog',
  labelDvd: '💿 DVD',
  labelGame: '🎮 Spil',
  labelStatus: 'Status',
  labelOwned: 'Ejet',
  labelWishlist: 'Ønskeliste',
  labelTitle: 'Titel',
  labelSeries: 'Serie',
  labelYear: 'År',
  labelLanguage: 'Sprog',
  labelPrice: 'Betalt pris',
  labelAcquired: 'Anskaffet',
  labelNotes: 'Noter',
  editItem: 'Rediger',
  addItemTitle: 'Tilføj',
  save: 'Gem',
  cancel: 'Annuller',
  delete: 'Slet',
  confirmDelete: 'Slet dette element?',
  noItems: 'Intet her endnu. Tryk + for at tilføje.',
  noResults: (q) => `Ingen resultater for "${q}"`,
  loading: 'Indlæser…',
  syncConnecting: 'Forbinder',
  syncConnected: 'Forbundet',
  syncDisconnected: 'Offline',
  titleRequired: 'Titel er påkrævet',
  yearInvalid: 'Angiv et gyldigt år',
  scanTitle: 'Scan titel fra omslag',
  scanning: 'Scanner…',
  scanTapLine: 'Tryk på en linje for at bruge som titel',
  scanNoText: 'Ingen tekst fundet — prøv et tydeligere foto',
  scanError: 'Scanning mislykkedes — prøv igen',
};

const ja: Strings = {
  addItem: '追加',
  searchPlaceholder: 'タイトル・シリーズを検索…',
  sortTitle: 'タイトル順',
  sortYearNewest: '年: 新しい順',
  sortYearOldest: '年: 古い順',
  sortAcquired: '最近追加',
  filterAll: 'すべて',
  filterUnread: '未読',
  filterRead: '既読',
  filterWishlist: 'ほしい物リスト',
  statsOwned: '所有',
  statsRead: '既読',
  statsUnread: '未読',
  statsDone: '完了',
  labelType: '種類',
  labelComic: '📚 マンガ・コミック',
  labelBook: '📖 本',
  labelDvd: '💿 DVD',
  labelGame: '🎮 ゲーム',
  labelStatus: '状態',
  labelOwned: '所有',
  labelWishlist: 'ほしい物',
  labelTitle: 'タイトル',
  labelSeries: 'シリーズ',
  labelYear: '年',
  labelLanguage: '言語',
  labelPrice: '購入価格',
  labelAcquired: '取得日',
  labelNotes: 'メモ',
  editItem: '編集',
  addItemTitle: '追加',
  save: '保存',
  cancel: 'キャンセル',
  delete: '削除',
  confirmDelete: 'この項目を削除しますか？',
  noItems: 'まだ何もありません。＋をタップして追加しましょう。',
  noResults: (q) => `「${q}」の検索結果なし`,
  loading: '読み込み中…',
  syncConnecting: '接続中',
  syncConnected: '接続済み',
  syncDisconnected: 'オフライン',
  titleRequired: 'タイトルは必須です',
  yearInvalid: '有効な年を入力してください',
  scanTitle: '表紙からタイトルを読み取る',
  scanning: 'スキャン中…',
  scanTapLine: 'タイトルにする行をタップ',
  scanNoText: 'テキストが見つかりません — 鮮明な写真でお試しください',
  scanError: 'スキャンに失敗しました — もう一度お試しください',
};

const TRANSLATIONS: Record<Locale, Strings> = {en, da, ja};

export function detectLocale(): Locale {
  const lang = navigator.language?.toLowerCase() ?? 'en';
  if (lang.startsWith('da')) return 'da';
  if (lang.startsWith('ja')) return 'ja';
  return 'en';
}

export function getStrings(locale: Locale): Strings {
  return TRANSLATIONS[locale] ?? en;
}

// React context helpers are in a separate file to avoid circular deps.
