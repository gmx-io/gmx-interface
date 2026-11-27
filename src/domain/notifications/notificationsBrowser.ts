import Bowser from "bowser";

import { isIOS } from "lib/headlessUiIsMobile";
import { getIsInstalledApp } from "lib/pwa/getIsInstalledApp";

/** Where the steps to allow notifications again differ. */
export type BlockedNotificationsPlatform = "iosApp" | "androidChrome" | "desktopChrome" | "other";

export function getIsBrave() {
  return "brave" in navigator;
}

export function getBlockedNotificationsPlatform(): BlockedNotificationsPlatform {
  if (isIOS()) {
    return getIsInstalledApp() ? "iosApp" : "other";
  }

  const { browser, os, platform } = Bowser.parse(navigator.userAgent);

  // Brave reports itself as Chrome, but its menus differ.
  if (browser.name !== "Chrome" || getIsBrave()) {
    return "other";
  }

  if (os.name === "Android") {
    return "androidChrome";
  }

  return platform.type === "desktop" ? "desktopChrome" : "other";
}
