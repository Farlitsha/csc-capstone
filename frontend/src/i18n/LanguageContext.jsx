import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { LANGUAGES, resolve } from "./translations";

const LANG_KEY = "commhub_lang";
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem(LANG_KEY);
    return LANGUAGES.includes(stored) ? stored : "en";
  });

  const setLang = useCallback((next) => {
    if (!LANGUAGES.includes(next)) return;
    localStorage.setItem(LANG_KEY, next);
    setLangState(next);
  }, []);

  const t = useCallback((key) => resolve(lang, key), [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
