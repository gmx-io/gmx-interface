import { t } from "@lingui/macro";
import { useCallback } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import SettingsIcon from "img/ic_settings.svg?react";

interface SettingsNavItemProps {
  isCollapsed: boolean | undefined;
  NavItem: React.ComponentType<any>;
}

export function SettingsNavItem({ isCollapsed, NavItem }: SettingsNavItemProps) {
  const { setIsSettingsVisible } = useSettings();

  const handleOpen = useCallback(() => {
    setIsSettingsVisible(true);
  }, [setIsSettingsVisible]);

  return (
    <NavItem
      icon={<SettingsIcon className="size-24" />}
      label={t`Settings`}
      isCollapsed={isCollapsed}
      onClick={handleOpen}
    />
  );
}
