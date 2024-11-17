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

type SentEventsInSession = {
  sessionId: string;
  events: string[];
};

type AnalyticsEventParams = {
  event: string;
  data: object;
};

const MAX_SESSION_ID_AGE = 1000 * 60 * 60 * 24; // 1 day
const SESSION_ID_COOKIE_NAME = "sessionId";
const USER_ANALYTICS_LAST_EVENT_TIME_KEY = "USER_ANALYTICS_LAST_EVENT_TIME";
const USER_ANALYTICS_SENT_EVENTS_KEY = "USER_ANALYTICS_SENT_EVENTS";

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

  getSentEvents() {
    const sentEventsStr = localStorage.getItem(USER_ANALYTICS_SENT_EVENTS_KEY);
    const sentEvents = sentEventsStr ? (JSON.parse(sentEventsStr) as SentEventsInSession) : undefined;

    return sentEvents;
  }

  getIsEventAlreadySent(sessionId: string, event: string) {
    const sentEvents = this.getSentEvents();

    if (sentEvents?.sessionId === sessionId) {
      return sentEvents.events.includes(event);
    }

    return false;
  }

  setSentEventBySession(sessionId: string, event: string) {
    let sentEvents = this.getSentEvents();

    if (sentEvents?.sessionId === sessionId) {
      sentEvents.events.push(event);
    } else {
      sentEvents = { sessionId, events: [event] };
    }

    localStorage.setItem(USER_ANALYTICS_SENT_EVENTS_KEY, JSON.stringify(sentEvents));
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

  pushEvent = <T extends AnalyticsEventParams = never>(params: T, onlyOncePerSession = false) => {
    this.setLastEventTime(Date.now());

    const sessionId = this.getOrSetSessionId();

    if (onlyOncePerSession && this.getIsEventAlreadySent(sessionId, params.event)) {
      return;
    }

    this.setSentEventBySession(sessionId, params.event);

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
