import { createContext, useContext, useState, useEffect, useCallback } from "react";

const SettingsContext = createContext(null);

const STORAGE_KEYS = {
  DATA_SAVER: "commhub_setting_datasaver",
  FONT_SIZE: "commhub_setting_fontsize",
  THEME: "commhub_setting_theme",
  REDUCE_MOTION: "commhub_setting_reducemotion",
};

export function isDataSaverActive() {
  if (typeof window === "undefined") return true;
  const saved = localStorage.getItem(STORAGE_KEYS.DATA_SAVER);
  return saved === null ? true : saved === "true";
}

export function SettingsProvider({ children }) {
  // 1. Data Saver: Defaults to TRUE to safeguard township mobile airtime / data bundles
  const [dataSaver, setDataSaverState] = useState(() => isDataSaverActive());

  // 2. Font Size: 'normal' | 'large' | 'xlarge'
  const [fontSize, setFontSizeState] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.FONT_SIZE) || "normal";
  });

  // 3. Theme: 'default' | 'high-contrast' | 'dark'
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.THEME) || "default";
  });

  // 4. Reduce Motion: boolean
  const [reduceMotion, setReduceMotionState] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.REDUCE_MOTION) === "true";
  });

  // Storage info state
  const [storageUsedKb, setStorageUsedKb] = useState(0);

  // Apply DOM attributes & sync localStorage
  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", fontSize);
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, fontSize);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-reduce-motion", reduceMotion ? "true" : "false");
    localStorage.setItem(STORAGE_KEYS.REDUCE_MOTION, reduceMotion ? "true" : "false");
  }, [reduceMotion]);

  const setDataSaver = (val) => {
    setDataSaverState(val);
    localStorage.setItem(STORAGE_KEYS.DATA_SAVER, val ? "true" : "false");
    // Dispatch custom event so listeners like revealedPhotos update instantly
    window.dispatchEvent(new Event("commhub_datasaver_changed"));
  };

  const setFontSize = (val) => setFontSizeState(val);
  const setTheme = (val) => setThemeState(val);
  const setReduceMotion = (val) => setReduceMotionState(val);

  // Calculate local storage usage
  const calculateStorage = useCallback(() => {
    try {
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || "";
          totalBytes += key.length * 2 + val.length * 2;
        }
      }
      setStorageUsedKb(Math.max(1, Math.round(totalBytes / 1024)));
    } catch {
      setStorageUsedKb(0);
    }
  }, []);

  useEffect(() => {
    calculateStorage();
  }, [calculateStorage]);

  // Clear offline cache but preserve authentication token and essential preferences
  const clearOfflineCache = () => {
    try {
      const token = localStorage.getItem("commhub_token");
      const currentDataSaver = localStorage.getItem(STORAGE_KEYS.DATA_SAVER);
      const currentFontSize = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
      const currentTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      const currentLang = localStorage.getItem("commhub_language");

      localStorage.clear();
      sessionStorage.clear();

      if (token) localStorage.setItem("commhub_token", token);
      if (currentDataSaver) localStorage.setItem(STORAGE_KEYS.DATA_SAVER, currentDataSaver);
      if (currentFontSize) localStorage.setItem(STORAGE_KEYS.FONT_SIZE, currentFontSize);
      if (currentTheme) localStorage.setItem(STORAGE_KEYS.THEME, currentTheme);
      if (currentLang) localStorage.setItem("commhub_language", currentLang);

      calculateStorage();
      return true;
    } catch {
      return false;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        dataSaver,
        setDataSaver,
        fontSize,
        setFontSize,
        theme,
        setTheme,
        reduceMotion,
        setReduceMotion,
        storageUsedKb,
        clearOfflineCache,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}

