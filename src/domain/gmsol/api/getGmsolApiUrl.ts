import { isDevelopment } from "config/env";
import { GMSOL_API_FIXTURES_KEY, SOLANA_API_URL_KEY } from "config/localStorage";

export function getGmsolApiUrlOverride() {
  if (isDevelopment()) {
    return localStorage.getItem(SOLANA_API_URL_KEY) || undefined;
  }
}

export function getIsGmsolApiFixturesEnabled() {
  return isDevelopment() && Boolean(localStorage.getItem(GMSOL_API_FIXTURES_KEY));
}
