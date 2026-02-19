import { t } from "@lingui/macro";
import { useCallback } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import SettingsIcon from "img/ic_settings.svg?react";

import { NavItem } from "./SideNav";

interface SettingsNavItemProps {
  isCollapsed: boolean | undefined;
  onClick?: () => void;
}

export function SettingsNavItem({ isCollapsed, onClick }: SettingsNavItemProps) {
  const { setIsSettingsVisible } = useSettings();

  const handleClick = useCallback(() => {
    onClick?.();
    setIsSettingsVisible(true);
  }, [onClick, setIsSettingsVisible]);

  return (
    <NavItem
      icon={<SettingsIcon className="size-20" />}
      label={t`Settings`}
      isCollapsed={isCollapsed}
      onClick={handleClick}
    />
  );
}
