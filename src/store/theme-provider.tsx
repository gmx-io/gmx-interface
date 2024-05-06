import React, { useState } from "react";

export type Theme = {
  theme: string;
  changeTheme: (isDark: boolean) => void;
  isDark: boolean;
  isLight: boolean;
};

export const ThemeContext = React.createContext<Theme>({
  theme: "dark",
  changeTheme: (isDark: boolean) => {},
  isDark: true,
  isLight: false,
});

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState("dark");

  const changeTheme = (isDark: boolean) => {
    setTheme(isDark ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, changeTheme, isDark: theme === "dark", isLight: theme === "light" }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
