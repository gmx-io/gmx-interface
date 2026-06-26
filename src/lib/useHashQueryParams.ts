import { useEffect } from "react";
import { useHistory, useLocation } from "react-router-dom";

// Privy appends these to window.location.search when returning from a social-login
// (OAuth) redirect, and reads them back from there to finish login. Moving them into
// the hash clears the query string and silently breaks social login, so leave them be.
const PRIVY_OAUTH_QUERY_PARAMS = ["privy_oauth_code", "privy_oauth_state", "privy_oauth_provider", "privy_oauth_error"];

export function getRelocatedHashQuery(
  search: string,
  hash: string,
  pathname: string
): { newUrl: string; newHash: string } | null {
  // Only act when there are query params before the hash
  if (!search || !hash) {
    return null;
  }

  const mainParams = new URLSearchParams(search);

  // Don't touch Privy's OAuth redirect params — the Privy SDK reads them from
  // window.location.search to complete social login.
  if (PRIVY_OAUTH_QUERY_PARAMS.some((param) => mainParams.has(param))) {
    return null;
  }

  const hashParams = new URLSearchParams(hash.split("?")[1] || "");

  // Merge params, with hash params taking precedence
  mainParams.forEach((value, key) => {
    if (!hashParams.has(key)) {
      hashParams.set(key, value);
    }
  });

  // Create new hash with merged params
  const newHash = hash.split("?")[0].replace("#", "") + (hashParams.toString() ? `?${hashParams.toString()}` : "");
  const newUrl = pathname + "#" + newHash;

  return { newUrl, newHash };
}

export function useHashQueryParams() {
  const location = useLocation();
  const history = useHistory();

  useEffect(() => {
    // If there are query params before the hash, move them after
    const relocated = getRelocatedHashQuery(window.location.search, window.location.hash, window.location.pathname);

    if (relocated) {
      // Update the URL without triggering a navigation
      window.history.replaceState({}, "", relocated.newUrl);

      // Update React Router's location to reflect the change
      history.replace(relocated.newHash);
    }
  }, [location.pathname, location.search, location.hash, history]);
}
