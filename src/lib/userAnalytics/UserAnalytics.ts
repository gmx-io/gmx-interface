import { setCookie } from "lib/cookies";
import { getCookie } from "lib/cookies";
import { metrics } from "../metrics/Metrics";
import { isDevelopment } from "config/env";

type CommonEventParams = {
  platform?: string;
  ordersCount?: number;
  isWalletConnected?: boolean;
};

type ProfileProps = {
  last30DVolume?: number;
  totalVolume?: number;
  languageCode: string;
  ref?: string;
  utm?: string;
};

type DedupEventsStorage = {
  // key:event -> timestamp
  [keyAndEvent: string]: number;
};

type AnalyticsEventParams = {
  event: string;
  data: object;
};

const MAX_SESSION_ID_AGE = 1000 * 60 * 60 * 24; // 1 day
const SESSION_ID_COOKIE_NAME = "sessionId";
const USER_ANALYTICS_LAST_EVENT_TIME_KEY = "USER_ANALYTICS_LAST_EVENT_TIME";

const MAX_DEDUP_INTERVAL = 1000 * 60 * 60 * 24; // 1 day
const USER_ANALYTICS_DEDUP_EVENTS_STORAGE = "USER_ANALYTICS_DEDUP_EVENTS_STORAGE";

export class UserAnalytics {
  commonEventParams: CommonEventParams = {} as CommonEventParams;

  setCommonEventParams = (params: CommonEventParams) => {
    this.commonEventParams = { ...this.commonEventParams, ...params };
  };

  getLastEventTime() {
    const lastEventTime = localStorage.getItem(USER_ANALYTICS_LAST_EVENT_TIME_KEY);
    return lastEventTime ? parseInt(lastEventTime) : 0;
  }

  setLastEventTime(time: number) {
    localStorage.setItem(USER_ANALYTICS_LAST_EVENT_TIME_KEY, time.toString());
  }

  getDedupEventsStorage() {
    const dedupEventsStorageStr = localStorage.getItem(USER_ANALYTICS_DEDUP_EVENTS_STORAGE);
    const dedupEventsStorage = dedupEventsStorageStr ? (JSON.parse(dedupEventsStorageStr) as DedupEventsStorage) : {};

    return dedupEventsStorage;
  }

  shouldDedupEvent(key: string, event: string, dedupInterval: number = MAX_DEDUP_INTERVAL) {
    const dedupEventsStorage = this.getDedupEventsStorage();

    const keyAndEvent = `${key}:${event}`;
    const lastSentTimestamp = dedupEventsStorage[keyAndEvent];

    if (lastSentTimestamp && Date.now() - lastSentTimestamp < dedupInterval) {
      return true;
    }

    return false;
  }

  saveDedupEventData(key: string, event: string) {
    const dedupEventsStorage = this.getDedupEventsStorage();

    // Clear old events
    Object.keys(dedupEventsStorage).forEach((key) => {
      if (Date.now() - dedupEventsStorage[key] > MAX_DEDUP_INTERVAL) {
        delete dedupEventsStorage[key];
      }
    });

    const keyAndEvent = `${key}:${event}`;
    dedupEventsStorage[keyAndEvent] = Date.now();

    localStorage.setItem(USER_ANALYTICS_DEDUP_EVENTS_STORAGE, JSON.stringify(dedupEventsStorage));
  }

  getOrSetSessionId() {
    let sessionId = getCookie(SESSION_ID_COOKIE_NAME);

    if (!sessionId || Date.now() - this.getLastEventTime() > MAX_SESSION_ID_AGE) {
      sessionId = Math.random().toString(36).substring(2, 15);
      const domain = isDevelopment() ? window.location.hostname : "gmx.io";
      setCookie(SESSION_ID_COOKIE_NAME, sessionId, MAX_SESSION_ID_AGE, domain);
    }

    return sessionId;
  }

  pushEvent = <T extends AnalyticsEventParams = never>(
    params: T,
    options: { onlyOncePerSession?: boolean; dedupKey?: string; dedupInterval?: number } = {}
  ) => {
    this.setLastEventTime(Date.now());

    const sessionId = this.getOrSetSessionId();

    const dedupKey = options.onlyOncePerSession ? sessionId : options.dedupKey;

    if (dedupKey && this.shouldDedupEvent(dedupKey, params.event, options.dedupInterval)) {
      return;
    }

    if (dedupKey) {
      this.saveDedupEventData(dedupKey, params.event);
    }

    metrics.pushBatchItem({
      type: "userAnalyticsEvent",
      payload: {
        event: params.event,
        distinctId: sessionId,
        customFields: {
          ...this.commonEventParams,
          ...params.data,
          time: Date.now(),
        },
      },
    });
  };

  pushProfileProps = (data: ProfileProps) => {
    this.setLastEventTime(Date.now());

    const sessionId = this.getOrSetSessionId();

    metrics.pushBatchItem({
      type: "userAnalyticsProfile",
      payload: {
        distinctId: sessionId,
        customFields: {
          ...data,
        },
      },
    });
  };
}

export const userAnalytics = new UserAnalytics();
