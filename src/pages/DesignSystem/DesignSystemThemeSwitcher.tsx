import { Theme, useTheme } from "context/ThemeContext/ThemeContext";

import { PoolsTabs } from "components/PoolsTabs/PoolsTabs";

import MoonIcon from "img/ic_moon.svg?react";
import SunIcon from "img/ic_sun.svg?react";

const OPTIONS: { label: JSX.Element; value: Theme }[] = [
  {
    value: "dark",
    label: (
      <span className="flex items-center gap-6">
        <MoonIcon className="size-16" />
        Dark
      </span>
    ),
  },
  {
    value: "light",
    label: (
      <span className="flex items-center gap-6">
        <SunIcon className="size-16" />
        Light
      </span>
    ),
  },
];

/**
 * Dark | Light switch for the design system pages, in the same style as the tabs on /pools.
 * Uses the app theme, so the choice is remembered.
 */
export function DesignSystemThemeSwitcher() {
  const { theme, setThemeMode } = useTheme();

  return (
    <PoolsTabs<Theme> tabs={OPTIONS} selected={theme} setSelected={setThemeMode} itemClassName="!text-body-large" />
  );
}
