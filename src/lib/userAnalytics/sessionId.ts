export const SESSION_ID_KEY = "sessionId";
export const MAX_SESSION_ID_AGE = 1000 * 60 * 60 * 24 * 4; // 4 days
export const USER_ANALYTICS_LAST_EVENT_TIME_KEY = "USER_ANALYTICS_LAST_EVENT_TIME";

export function setLastEventTime(time: number) {
  localStorage.setItem(USER_ANALYTICS_LAST_EVENT_TIME_KEY, time.toString());
}

export function getLastEventTime() {
  const lastEventTime = localStorage.getItem(USER_ANALYTICS_LAST_EVENT_TIME_KEY);
  return parseInt(lastEventTime as string) || 0;
}

export function setSessionId(sessionId: string) {
  localStorage.setItem(SESSION_ID_KEY, sessionId);
  setLastEventTime(Date.now());
}

export function getRawSessionId() {
  return localStorage.getItem(SESSION_ID_KEY);
}

export function getOrSetSessionId() {
  let sessionId = getRawSessionId();

  if (!sessionId || Date.now() - getLastEventTime() > MAX_SESSION_ID_AGE) {
    sessionId = Math.random().toString(36).substring(2, 15);
    setSessionId(sessionId);
  }

  return sessionId;
}
