import { t } from "@lingui/macro";

import { useTheme } from "context/ThemeContext/ThemeContext";

import MoonIcon from "img/ic_moon.svg?react";
import SunIcon from "img/ic_sun.svg?react";

import { NavItem } from "./SideNav";

interface ThemeNavItemProps {
  isCollapsed: boolean | undefined;
}

export function ThemeNavItem({ isCollapsed }: ThemeNavItemProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <NavItem
      icon={theme === "dark" ? <SunIcon /> : <MoonIcon />}
      label={theme === "dark" ? t`Light Mode` : t`Dark Mode`}
      isCollapsed={isCollapsed}
      onClick={toggleTheme}
    />
  );
}
