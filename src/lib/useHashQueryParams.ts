import { useEffect } from "react";
import { useHistory, useLocation } from "react-router-dom";

export function useHashQueryParams() {
  const location = useLocation();
  const history = useHistory();

  useEffect(() => {
    const hash = window.location.hash;

    // If there are query params before the hash, move them after
    if (window.location.search && hash) {
      const mainParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(hash.split("?")[1] || "");

      // Merge params, with hash params taking precedence
      mainParams.forEach((value, key) => {
        if (!hashParams.has(key)) {
          hashParams.set(key, value);
        }
      });

      // Create new hash with merged params
      const newHash = hash.split("?")[0].replace("#", "") + (hashParams.toString() ? `?${hashParams.toString()}` : "");

      // Update the URL without triggering a navigation
      const newUrl = window.location.pathname + "#" + newHash;
      window.history.replaceState({}, "", newUrl);

      // Update React Router's location to reflect the change
      history.replace(newHash);
    }
  }, [location.pathname, location.search, location.hash, history]);
}
