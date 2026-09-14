// Temporary workaround for the Trust Wallet iOS in-app browser: its floating toolbar covers the bottom of the
// web view without being reported in env(safe-area-inset-bottom), and its expanded address bar covers the top
// without shrinking the layout viewport. Remove together with the trust-ios block in styles/Shared.scss once
// Trust reports both through the safe area.

export const IN_APP_BROWSER_ATTRIBUTE = "data-in-app-browser";
export const TRUST_WALLET_IOS_BROWSER = "trust-ios";
export const VIEWPORT_OVERHANG_PROPERTY = "--in-app-browser-viewport-overhang";

const LATE_INJECTION_CHECK_DELAY_MS = 3000;

type WindowWithTrustWallet = Window & {
  trustwallet?: unknown;
};

export function getIsTrustWalletIosBrowser(browserWindow: Window = window): boolean {
  const { trustwallet, ethereum, navigator } = browserWindow as WindowWithTrustWallet;

  return /iPhone|iPad|iPod/.test(navigator.userAgent) && (trustwallet !== undefined || Boolean(ethereum?.isTrust));
}

export function configureInAppBrowser(browserWindow: Window = window) {
  const { documentElement } = browserWindow.document;

  const updateViewportOverhang = () => {
    const overhang = Math.max(0, documentElement.clientHeight - browserWindow.innerHeight);

    documentElement.style.setProperty(VIEWPORT_OVERHANG_PROPERTY, `${overhang}px`);
  };

  const apply = () => {
    if (documentElement.hasAttribute(IN_APP_BROWSER_ATTRIBUTE)) {
      return true;
    }

    if (!getIsTrustWalletIosBrowser(browserWindow)) {
      return false;
    }

    documentElement.setAttribute(IN_APP_BROWSER_ATTRIBUTE, TRUST_WALLET_IOS_BROWSER);
    updateViewportOverhang();
    browserWindow.addEventListener("resize", updateViewportOverhang);
    browserWindow.visualViewport?.addEventListener("resize", updateViewportOverhang);

    return true;
  };

  if (apply()) {
    return;
  }

  browserWindow.addEventListener("ethereum#initialized", apply, { once: true });
  browserWindow.setTimeout(apply, LATE_INJECTION_CHECK_DELAY_MS);
}
