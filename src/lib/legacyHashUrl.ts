// Privy puts these into the query string when returning from a social-login (OAuth) redirect and
// reads them back from location.search to finish login. Rewriting the url out from under the SDK
// silently broke social login before (89f2d7ac11), so a url carrying them is left alone.
const PRIVY_OAUTH_QUERY_PARAMS = ["privy_oauth_code", "privy_oauth_state", "privy_oauth_provider", "privy_oauth_error"];

export function isMetaMaskIosInAppBrowser(userAgent: string): boolean {
  return (
    /MetaMaskMobile/i.test(userAgent) && !/Android/i.test(userAgent) && /iPhone|iPad|iPod|Macintosh/i.test(userAgent)
  );
}

export function shouldUseLegacyHashRouter(userAgent: string): boolean {
  return isMetaMaskIosInAppBrowser(userAgent);
}

export function getUrlForMetaMaskIosHashRouter(href: string): string | undefined {
  const url = new URL(href);

  if (url.hash.startsWith("#/")) {
    const cleanUrl = getUrlWithoutLegacyHashRoute(href);
    const normalizedUrl = cleanUrl && getUrlForMetaMaskIosHashRouter(cleanUrl);

    return normalizedUrl === href ? undefined : normalizedUrl;
  }

  const routeParams = new URLSearchParams();
  const privyParams = new URLSearchParams();

  url.searchParams.forEach((value, key) => {
    if (PRIVY_OAUTH_QUERY_PARAMS.includes(key)) {
      privyParams.append(key, value);
    } else {
      routeParams.append(key, value);
    }
  });

  const routeSearch = routeParams.toString();
  const privySearch = privyParams.toString();

  return `${url.origin}/${privySearch ? `?${privySearch}` : ""}#${url.pathname}${routeSearch ? `?${routeSearch}` : ""}${url.hash}`;
}

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

  if (PRIVY_OAUTH_QUERY_PARAMS.some((param) => url.searchParams.has(param))) {
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
    if (isMetaMaskIosInAppBrowser(window.navigator.userAgent)) {
      const url = getUrlForMetaMaskIosHashRouter(window.location.href);

      if (url) {
        window.history.replaceState(window.history.state, "", url);
      }

      return;
    }

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
 * one, since it always sits on `/`.
 */
export function watchLegacyHashUrl(navigate = replaceUrlInPlace) {
  if (isMetaMaskIosInAppBrowser(window.navigator.userAgent)) {
    return () => undefined;
  }

  const handleHashChange = () => {
    const url = getUrlWithoutLegacyHashRoute(window.location.href);

    if (url) {
      navigate(url);
    }
  };

  window.addEventListener("hashchange", handleHashChange);

  return () => window.removeEventListener("hashchange", handleHashChange);
}

/**
 * Rewrites the url without a document navigation: `location.replace` reloads the app and kills
 * whatever is in flight, a wallet connect above all. `replaceState` alone is invisible to the
 * router, so a popstate event follows — it must carry a non-undefined `state`, or react-router
 * dismisses it as extraneous.
 */
function replaceUrlInPlace(url: string) {
  try {
    const state = window.history.state ?? null;

    window.history.replaceState(state, "", url);
    window.dispatchEvent(new PopStateEvent("popstate", { state }));
  } catch {
    // Safari throttles history rewrites (SecurityError past 100 in 10 seconds); dropping this one
    // is better than falling back to a reload.
  }
}
