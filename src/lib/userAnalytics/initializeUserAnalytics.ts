import { captureUtmParams } from "domain/utm";

import { getOrSetSessionId, SESSION_ID_KEY } from "./sessionId";

export function initializeUserAnalytics() {
  getOrSetSessionId();
  captureUtmParams();

  const url = new URL(window.location.href);
  if (url.searchParams.has(SESSION_ID_KEY)) {
    url.searchParams.delete(SESSION_ID_KEY);
    window.history.replaceState(window.history.state, "", url);
  }
}
