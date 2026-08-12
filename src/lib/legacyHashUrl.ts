/**
 * The app used to run on hash routing (`https://app.gmx.io/#/trade?ref=CODE`). Old bookmarks,
 * shared links and third-party integrations still point there, and the fragment never reaches the
 * server, so the legacy route has to be rewritten to a real path on the client before the router
 * mounts.
 */
export function getUrlWithoutLegacyHashRoute(href: string): string | undefined {
  const url = new URL(href);

  // Plain anchors like `#bridge` are not legacy routes.
  if (!url.hash.startsWith("#/")) {
    return undefined;
  }

  // `#/buy_gmx?foo=bar#bridge` -> path `/buy_gmx`, hash query `?foo=bar`, anchor `#bridge`
  const hashRoute = url.hash.slice(1);
  const anchorIndex = hashRoute.indexOf("#");
  const pathWithQuery = anchorIndex === -1 ? hashRoute : hashRoute.slice(0, anchorIndex);
  const anchor = anchorIndex === -1 ? "" : hashRoute.slice(anchorIndex);

  const queryIndex = pathWithQuery.indexOf("?");
  const pathname = queryIndex === -1 ? pathWithQuery : pathWithQuery.slice(0, queryIndex);
  const params = new URLSearchParams(queryIndex === -1 ? "" : pathWithQuery.slice(queryIndex));

  // Params in front of the hash were supported as well, params inside the hash take precedence.
  new URLSearchParams(url.search).forEach((value, key) => {
    if (!params.has(key)) {
      params.set(key, value);
    }
  });

  const search = params.toString();

  return `${url.origin}${pathname}${search ? `?${search}` : ""}${anchor}`;
}

export function redirectLegacyHashUrl() {
  try {
    const url = getUrlWithoutLegacyHashRoute(window.location.href);

    if (url) {
      window.history.replaceState(window.history.state, "", url);
    }
  } catch {
    // Runs before the app mounts, so a failed rewrite must not take the page down.
  }
}

/**
 * Following a legacy link while already sitting on its path only changes the fragment, so the
 * document is not reloaded and the rewrite above never runs again. The landing page is the exposed
 * one, since it always sits on `/`. Navigating rather than rewriting the history entry is what
 * makes the router pick the new path up.
 */
export function watchLegacyHashUrl(navigate = (url: string) => window.location.replace(url)) {
  const handleHashChange = () => {
    const url = getUrlWithoutLegacyHashRoute(window.location.href);

    if (url) {
      navigate(url);
    }
  };

  window.addEventListener("hashchange", handleHashChange);

  return () => window.removeEventListener("hashchange", handleHashChange);
}
