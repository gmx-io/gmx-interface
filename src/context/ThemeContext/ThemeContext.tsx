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

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeMode, setThemeModeState] = useLocalStorageSerializeKey<ThemeMode>("app-theme-mode", "dark");
  const prefersDarkMode = useMedia("(prefers-color-scheme: dark)");
  const systemTheme: ResolvedTheme = prefersDarkMode ? "dark" : "light";

  const theme = useMemo(() => {
    if (themeMode === "system") {
      return systemTheme;
    }
    return themeMode as ResolvedTheme;
  }, [themeMode, systemTheme]);

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
      themeMode: themeMode || "dark",
      setThemeMode: setThemeModeState,
    }),
    [theme, themeMode, setThemeModeState]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
