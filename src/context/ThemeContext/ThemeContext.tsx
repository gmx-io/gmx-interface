import { createContext, useContext, useEffect, ReactNode, useMemo, useCallback, useState } from "react";

import { useLocalStorageSerializeKey } from "lib/localStorage";

type ThemeMode = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

interface ThemeContextType {
  theme: ResolvedTheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "dark";
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeMode, setThemeModeState] = useLocalStorageSerializeKey<ThemeMode>("app-theme-mode", "dark");
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  const theme = useMemo(() => {
    if (themeMode === "system") {
      return systemTheme;
    }
    return themeMode as ResolvedTheme;
  }, [themeMode, systemTheme]);

  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      setThemeModeState(mode);
    },
    [setThemeModeState]
  );

  const toggleTheme = useCallback(() => {
    if (themeMode === "system") {
      setThemeModeState(systemTheme === "dark" ? "light" : "dark");
    } else {
      setThemeModeState(themeMode === "dark" ? "light" : "dark");
    }
  }, [setThemeModeState, themeMode, systemTheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      }
    };
  }, []);

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
      setThemeMode,
      toggleTheme,
    }),
    [theme, themeMode, setThemeMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
