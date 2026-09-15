import { getSharedAnalyticsValue, setSharedAnalyticsValue } from "./sharedStorage";

export const SESSION_ID_KEY = "sessionId";
const USER_ANALYTICS_LAST_EVENT_TIME_KEY = "USER_ANALYTICS_LAST_EVENT_TIME";

export function setLastEventTime(time: number) {
  localStorage.setItem(USER_ANALYTICS_LAST_EVENT_TIME_KEY, time.toString());
}

export function setSessionId(sessionId: string) {
  localStorage.setItem(SESSION_ID_KEY, sessionId);
  setSharedAnalyticsValue(SESSION_ID_KEY, sessionId);
  setLastEventTime(Date.now());
}

export function getRawSessionId() {
  return getSharedAnalyticsValue(SESSION_ID_KEY) || localStorage.getItem(SESSION_ID_KEY);
}

export function getOrSetSessionId() {
  const sessionId =
    getRawSessionId() ||
    new URLSearchParams(window.location.search).get(SESSION_ID_KEY) ||
    Math.random().toString(36).substring(2, 15);

  if (localStorage.getItem(SESSION_ID_KEY) !== sessionId) {
    setSessionId(sessionId);
  } else {
    setSharedAnalyticsValue(SESSION_ID_KEY, sessionId);
  }

  return sessionId;
}
