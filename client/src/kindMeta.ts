import type {ItemKind} from './store.ts';

export interface KindVerbs {
  done: string;          // "read" / "watched" / "played"
  notDone: string;       // "unread" / "unwatched" / "unplayed"
  filterDone: string;
  filterNotDone: string;
  formDone: string;      // "Read?" / "Watched?" / "Played?"
}

// Per-kind verb sets for each locale.
const verbMap: Record<ItemKind, Record<string, KindVerbs>> = {
  comic: {
    en: {done: 'read',    notDone: 'unread',    filterDone: 'Read',    filterNotDone: 'Unread',    formDone: 'Read?'},
    da: {done: 'læst',   notDone: 'ulæst',     filterDone: 'Læst',    filterNotDone: 'Ulæst',    formDone: 'Læst?'},
    ja: {done: '既読',   notDone: '未読',      filterDone: '既読',    filterNotDone: '未読',     formDone: '読んだ？'},
  },
  book: {
    en: {done: 'read',    notDone: 'unread',    filterDone: 'Read',    filterNotDone: 'Unread',    formDone: 'Read?'},
    da: {done: 'læst',   notDone: 'ulæst',     filterDone: 'Læst',    filterNotDone: 'Ulæst',    formDone: 'Læst?'},
    ja: {done: '既読',   notDone: '未読',      filterDone: '既読',    filterNotDone: '未読',     formDone: '読んだ？'},
  },
  dvd: {
    en: {done: 'watched', notDone: 'unwatched', filterDone: 'Watched', filterNotDone: 'Unwatched', formDone: 'Watched?'},
    da: {done: 'set',    notDone: 'uset',      filterDone: 'Set',     filterNotDone: 'Uset',     formDone: 'Set?'},
    ja: {done: '視聴済', notDone: '未視聴',    filterDone: '視聴済',  filterNotDone: '未視聴',   formDone: '観た？'},
  },
  game: {
    en: {done: 'played',  notDone: 'unplayed',  filterDone: 'Played',  filterNotDone: 'Unplayed',  formDone: 'Played?'},
    da: {done: 'spillet', notDone: 'uspillet',  filterDone: 'Spillet', filterNotDone: 'Uspillet', formDone: 'Spillet?'},
    ja: {done: 'プレイ済', notDone: '未プレイ', filterDone: 'プレイ済', filterNotDone: '未プレイ', formDone: 'プレイした？'},
  },
};

const fallback: KindVerbs = {
  done: 'done', notDone: 'not done',
  filterDone: 'Done', filterNotDone: 'Not done', formDone: 'Done?',
};

export function getKindVerbs(kind: ItemKind | string, locale: string): KindVerbs {
  return verbMap[kind as ItemKind]?.[locale] ?? verbMap[kind as ItemKind]?.['en'] ?? fallback;
}
