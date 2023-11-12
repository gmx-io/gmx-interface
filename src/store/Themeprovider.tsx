import React, { useState } from "react";

export type Theme = {
  theme: string;
  changeTheme: (isDark: boolean) => void;
};

export const ThemeContext = React.createContext<Theme>({
  theme: "dark",
  changeTheme: (isDark: boolean) => {},
});

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState("light");

  const updateTheme = (isDark : boolean) => {
    setTheme(isDark ? "dark" : "light");
  };

  return <ThemeContext.Provider value={{ theme, changeTheme: updateTheme }}>{children}</ThemeContext.Provider>;
};

export default ThemeProvider;
