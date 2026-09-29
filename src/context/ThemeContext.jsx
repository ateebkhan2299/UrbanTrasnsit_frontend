import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

// index.css defines both palettes off these exact class names on <html>.
const THEME_CLASS = { light: 'light-mode', dark: 'red-mode' };
const STORAGE_KEY = 'transit_theme';

export const ThemeContext = createContext(null);

export function useTheme() {
  return (
    useContext(ThemeContext) || {
      theme: 'light',
      isLightMode: true,
      isDarkMode: false,
      toggleTheme: () => {},
    }
  );
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    // Replace the class rather than assign className so other utilities added
    // to <html> by the browser tooling are not wiped out.
    root.classList.remove('light-mode', 'red-mode');
    root.classList.add(THEME_CLASS[theme]);
    root.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isLightMode: theme === 'light',
      isDarkMode: theme === 'dark',
      setTheme,
      toggleTheme,
    }),
    [theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
