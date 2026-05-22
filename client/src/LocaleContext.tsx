import {createContext, useContext, useState, type ReactNode} from 'react';
import {detectLocale, getStrings} from './i18n.ts';
import type {Locale, Strings} from './i18n.ts';

interface LocaleContextValue {
  locale: Locale;
  strings: Strings;
  setLocale: (l: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  strings: getStrings('en'),
  setLocale: () => {},
});

export function LocaleProvider({children}: {children: ReactNode}) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);
  const strings = getStrings(locale);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem('tsundoku-locale', l); } catch {}
  };

  return (
    <LocaleContext.Provider value={{locale, strings, setLocale}}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
