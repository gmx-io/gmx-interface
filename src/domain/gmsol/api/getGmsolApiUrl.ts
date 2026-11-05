import { isDevelopment } from "config/env";
import { GMSOL_API_URL } from "config/gmsol/api";
import { GMSOL_API_FIXTURES_KEY, SOLANA_API_URL_KEY } from "config/localStorage";

export function getGmsolApiUrl() {
  if (isDevelopment()) {
    const url = localStorage.getItem(SOLANA_API_URL_KEY);
    if (url) {
      return url;
    }
  }

  return GMSOL_API_URL;
}

export function getIsGmsolApiFixturesEnabled() {
  return isDevelopment() && Boolean(localStorage.getItem(GMSOL_API_FIXTURES_KEY));
}
