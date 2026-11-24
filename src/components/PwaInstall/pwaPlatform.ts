import { isDevelopment } from "config/env";
import { getIsInstalledApp } from "lib/pwa/getIsInstalledApp";

/**
 * Where GMX runs, as far as installing and notifications are concerned.
 * - iphone-*: iPhone or iPad. No install dialog exists, so the user follows the Share → Add to Home Screen steps.
 * - android-chrome: the browser can open its own install dialog (beforeinstallprompt).
 * - android-other, iphone-other: a browser without an install dialog; installing works by hand from its menu.
 * - in-app: a wallet or messenger browser. It can't install, so GMX offers "Copy link" instead.
 * - desktop-*: computers. Chromium browsers can install; Safari only by hand (File → Add to Dock); Firefox can't.
 */
export type PwaPlatform =
  | "iphone-safari"
  | "iphone-chrome"
  | "iphone-other"
  | "android-chrome"
  | "android-other"
  | "in-app"
  | "desktop-chromium"
  | "desktop-safari"
  | "desktop-other";

const IN_APP_BROWSER_PATTERN =
  /MetaMaskMobile|Trust|CoinbaseWallet|OKApp|OKEx|Bitget|BitKeep|Rainbow|Phantom|Rabby|imToken|TokenPocket|Zerion|Telegram|FBAN|FBAV|Instagram|Line\//i;

type NavigatorWithTouch = Navigator & { maxTouchPoints?: number };

/**
 * The install entries, cards and the /download page show only outside gmx.io (localhost and preview links) until the
 * build tasks connect the triggers and the notifications state. Then this gate goes.
 */
export function getIsPwaInstallUiEnabled() {
  return typeof window !== "undefined" && isDevelopment();
}

function getIsIos() {
  return (
    /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
    // iPads ask for the desktop site and report a Mac with touch.
    (window.navigator.platform === "MacIntel" && ((window.navigator as NavigatorWithTouch).maxTouchPoints ?? 0) > 1)
  );
}

export function getIsAndroidUserAgent() {
  return typeof window !== "undefined" && /Android/i.test(window.navigator.userAgent);
}

export function detectPwaPlatform(): PwaPlatform {
  if (typeof window === "undefined") {
    return "desktop-other";
  }

  const userAgent = window.navigator.userAgent;
  const isTelegramWebview = "TelegramWebviewProxy" in window;
  const isAndroid = /Android/i.test(userAgent);

  if (isTelegramWebview || IN_APP_BROWSER_PATTERN.test(userAgent) || (isAndroid && /; wv\)/.test(userAgent))) {
    return "in-app";
  }

  if (getIsIos()) {
    if (/CriOS/.test(userAgent)) return "iphone-chrome";
    if (/FxiOS|EdgiOS|OPiOS/.test(userAgent)) return "iphone-other";
    return "iphone-safari";
  }

  if (isAndroid) {
    return /Chrome|SamsungBrowser|EdgA/.test(userAgent) && !/Firefox/.test(userAgent)
      ? "android-chrome"
      : "android-other";
  }

  if (/Firefox/.test(userAgent)) return "desktop-other";
  if (/Chrome|Chromium|Edg\//.test(userAgent)) return "desktop-chromium";
  if (/Safari/.test(userAgent)) return "desktop-safari";

  return "desktop-other";
}

/**
 * From this iOS version Safari keeps Share behind ≡ in the address bar, so the first install step changes.
 * The build task confirms the exact version on a device.
 */
export const IOS_SHARE_IN_MENU_FROM_VERSION = 27;

/**
 * The iOS major version. Safari on iOS 26+ freezes the OS number in the user agent (it keeps saying 18_x), so its real
 * version is read from "Version/27.0"; other iPhone browsers (Chrome, Firefox) still report the OS number.
 */
export function detectIosVersion(): number | undefined {
  if (typeof window === "undefined" || !getIsIos()) return undefined;

  const userAgent = window.navigator.userAgent;
  const safariVersion = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent) ? undefined : userAgent.match(/Version\/(\d+)/)?.[1];
  const osVersion = userAgent.match(/OS (\d+)_\d+(?:_\d+)? like Mac OS X/)?.[1];
  const version = safariVersion ?? osVersion;

  return version ? Number(version) : undefined;
}

export function getIsShareInIosMenu(iosVersion: number | undefined) {
  // Unknown version: show the newest steps.
  return iosVersion === undefined || iosVersion >= IOS_SHARE_IN_MENU_FROM_VERSION;
}

export function getIsPhonePlatform(platform: PwaPlatform) {
  return platform.startsWith("iphone") || platform.startsWith("android") || platform === "in-app";
}

export function getIsComputerPlatform(platform: PwaPlatform) {
  return platform.startsWith("desktop");
}

/** Platforms where GMX shows its own install card after a completed trade (never on computers). */
export function getCanShowInstallCard(platform: PwaPlatform) {
  return platform === "iphone-safari" || platform === "iphone-chrome" || platform === "android-chrome";
}

/** Computers where "Install on this computer" works: Chrome and Edge open their own window, Mac Safari has Add to Dock. */
export function getCanInstallOnComputer(platform: PwaPlatform) {
  return platform === "desktop-chromium" || platform === "desktop-safari";
}

/**
 * Where notifications can be turned on. On iPhone they only work in the installed app;
 * Android and computers can also get them in the browser.
 */
export function getCanUseNotifications(platform: PwaPlatform, isInstalled: boolean) {
  if (platform === "in-app") return false;
  if (platform.startsWith("iphone")) return isInstalled;
  return true;
}

export { getIsInstalledApp };
