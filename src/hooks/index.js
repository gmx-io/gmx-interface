import { useEffect, useState } from "react";

export const themeHandler = () => {
  const theme = localStorage.getItem("theme");
  if (theme === "light") {
    return "black";
  } else {
    return "white";
  }
};

export const lazyThemeInitialState = () => {
  const theme = localStorage.getItem("theme");
  if (theme === "light") {
    return false;
  } else {
    return true;
  }
};

export const themeBgHandler = () => {
  const theme = localStorage.getItem("theme");
  if (theme === "light") {
    return "white";
  } else {
    return "#16182e";
  }
};

export const useThemeBgHandler = () => {
  const defaultTheme = localStorage.getItem("theme");
  const [theme, setTheme] = useState(lazyThemeInitialState());

  useEffect(() => {
    setTheme(lazyThemeInitialState());
  }, [defaultTheme]);

  return theme;
};
