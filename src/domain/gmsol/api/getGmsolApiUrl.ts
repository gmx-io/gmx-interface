import { isDevelopment } from "config/env";
import { SOLANA_API_URL_KEY } from "config/localStorage";

export function getGmsolApiUrlOverride() {
  if (isDevelopment()) {
    return localStorage.getItem(SOLANA_API_URL_KEY) || undefined;
  }
}
