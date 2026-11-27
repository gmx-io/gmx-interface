import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { t } from "@lingui/macro";
import { useCallback, useEffect, useState } from "react";

import Portal from "components/Portal/Portal";
import { NavItem } from "components/SideNav/SideNav";

import DownloadIcon from "img/ic_download2.svg?react";

import { DesktopInstallPopup } from "./DesktopInstallPopup";
import { startInstall } from "./pwaActions";
import { getIsComputerPlatform, getIsPwaInstallUiEnabled } from "./pwaPlatform";
import { setPwaState, usePwaState } from "./pwaStore";
import { usePwaEnvironment } from "./usePwaEnvironment";

type Props = {
  isCollapsed: boolean | undefined;
  onClick?: () => void;
};

/**
 * The permanent "Install app" entry, above Settings in the menu. Hidden inside the installed app, once GMX was
 * installed from this browser, and in Android browsers without an install window (e.g. Firefox). On phones a dot
 * marks it until the first tap; computers get the quieter entry with no dot, and it opens the QR popup.
 */
export function InstallAppNavItem(props: Props) {
  if (!getIsPwaInstallUiEnabled()) {
    return null;
  }

  return <InstallAppNavItemContent {...props} />;
}

function InstallAppNavItemContent({ isCollapsed, onClick }: Props) {
  const { platform, isInstalled } = usePwaEnvironment();
  const { isMenuDotSeen, hasInstalled } = usePwaState();
  const isComputer = getIsComputerPlatform(platform);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const { refs, floatingStyles, elements } = useFloating({
    open: isPopupOpen,
    placement: "right-end",
    middleware: [offset(12), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if (!isPopupOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (elements.floating?.contains(target) || (elements.reference as HTMLElement | null)?.contains(target)) return;
      setIsPopupOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsPopupOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPopupOpen, elements.floating, elements.reference]);

  const handleClick = useCallback(() => {
    if (isComputer) {
      setPwaState({ isMenuDotSeen: true });
      setIsPopupOpen((open) => !open);
      return;
    }

    onClick?.();
    startInstall(platform, "menu");
  }, [isComputer, onClick, platform]);

  const handleInstallHere = useCallback(() => {
    setIsPopupOpen(false);
    onClick?.();
    startInstall(platform, "menu");
  }, [onClick, platform]);

  if (isInstalled || hasInstalled || platform === "android-other") {
    return null;
  }

  return (
    <>
      <NavItem
        buttonRef={refs.setReference}
        icon={
          <span className="relative flex">
            <DownloadIcon className="size-20" />
            {!isComputer && !isMenuDotSeen ? (
              <span className="absolute -right-2 -top-2 size-6 rounded-full bg-blue-300" aria-hidden />
            ) : null}
          </span>
        }
        label={t`Install app`}
        isActive={isPopupOpen}
        isCollapsed={isCollapsed}
        onClick={handleClick}
      />
      {isPopupOpen ? (
        <Portal>
          <div ref={refs.setFloating} style={floatingStyles} className="z-[1100]">
            <DesktopInstallPopup platform={platform} onInstallHere={handleInstallHere} />
          </div>
        </Portal>
      ) : null}
    </>
  );
}
