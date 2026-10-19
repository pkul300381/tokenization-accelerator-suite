import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'system' | 'light' | 'dark';
type ThemeContextValue = { theme: Theme; cycleTheme: () => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);
const sequence: Theme[] = ['system', 'dark', 'light'];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = window.localStorage.getItem('opus-theme');
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  });

  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('opus-theme', theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    cycleTheme: () => setTheme((current) => sequence[(sequence.indexOf(current) + 1) % sequence.length]),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
