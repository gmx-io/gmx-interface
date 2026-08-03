import { useCallback, useEffect, useState } from "react";

export const WALLET_EXTENSION_CONNECTION_BANNER_START = Date.UTC(2026, 7, 3, 12, 30);
export const WALLET_EXTENSION_CONNECTION_BANNER_END = Date.UTC(2026, 7, 4, 12, 30);

export function isWalletExtensionConnectionBannerActive(timestamp: number): boolean {
  return timestamp >= WALLET_EXTENSION_CONNECTION_BANNER_START && timestamp < WALLET_EXTENSION_CONNECTION_BANNER_END;
}

export function useWalletExtensionConnectionBanner(pathname: string) {
  const [now, setNow] = useState(() => Date.now());
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const nextBoundary =
      now < WALLET_EXTENSION_CONNECTION_BANNER_START
        ? WALLET_EXTENSION_CONNECTION_BANNER_START
        : now < WALLET_EXTENSION_CONNECTION_BANNER_END
          ? WALLET_EXTENSION_CONNECTION_BANNER_END
          : undefined;

    if (nextBoundary === undefined) return;

    const timeoutId = window.setTimeout(() => setNow(Date.now()), Math.max(0, nextBoundary - Date.now()));
    return () => window.clearTimeout(timeoutId);
  }, [now]);

  const dismiss = useCallback(() => setIsDismissed(true), []);
  const isVisible = pathname !== "/announcements" && !isDismissed && isWalletExtensionConnectionBannerActive(now);

  return { isVisible, dismiss };
}
