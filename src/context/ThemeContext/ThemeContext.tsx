import { createContext, useContext, useEffect, ReactNode, useMemo } from "react";
import { useMedia } from "react-use";

import { useLocalStorageSerializeKey } from "lib/localStorage";

type ThemeMode = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

interface ThemeContextType {
  theme: ResolvedTheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

const DEFAULT_THEME_MODE = "dark";

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeMode, setThemeModeState] = useLocalStorageSerializeKey<ThemeMode>("app-theme-mode", DEFAULT_THEME_MODE);
  const prefersDarkMode = useMedia("(prefers-color-scheme: dark)");
  const systemTheme: ResolvedTheme = prefersDarkMode ? "dark" : "light";

  const theme = themeMode === "system" ? systemTheme : themeMode || DEFAULT_THEME_MODE;

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      themeMode: themeMode || DEFAULT_THEME_MODE,
      setThemeMode: setThemeModeState,
    }),
    [theme, themeMode, setThemeModeState]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
