export type NotificationTap = {
  /** The route as the service worker sent it, with its chain. */
  route: string;
  /** The trade page to open once the app is on `chainId`. */
  path: string;
  chainId: number | undefined;
};

// Anyone can open the app with this route in its URL, so it gets the same check as in public/sw.js.
export function parseNotificationRoute(route: string, origin = window.location.origin): NotificationTap | undefined {
  let url: URL;
  try {
    url = new URL(route, origin);
  } catch {
    return undefined;
  }

  if (url.origin !== origin || (url.pathname !== "/trade" && !url.pathname.startsWith("/trade/"))) {
    return undefined;
  }

  const chainId = Number(url.searchParams.get("chainId") ?? undefined);
  url.searchParams.delete("chainId");

  return {
    route,
    path: `${url.pathname}${url.search}`,
    chainId: Number.isSafeInteger(chainId) && chainId > 0 ? chainId : undefined,
  };
}
