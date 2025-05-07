import { AbFlag, getAbFlagUrlParams } from "config/ab";
import { UserAnalyticsEventItem } from "lib/oracleKeeperFetcher";
import { sleep } from "lib/sleep";

import { metrics } from "../metrics/Metrics";

type CommonEventParams = {
  platform?: string;
  browserName?: string;
  ordersCount?: number;
  isWalletConnected?: boolean;
  isTest: boolean;
  isInited?: boolean;
} & {
  [key in AbFlag]: boolean;
};

type ProfileProps = {
  last30DVolume?: number;
  totalVolume?: number;
  languageCode: string;
  ExpressEnabled: boolean;
  Express1CTEnabled: boolean;
  ref?: string;
  utm?: string;
  isChartPositionsEnabled?: boolean;
  showLeverageSlider?: boolean;
  displayPnLAfterFees?: boolean;
  includePnlInLeverageDisplay?: boolean;
  autoCancelTPSL?: boolean;
  enableExternalSwaps?: boolean;
};

type DedupEventsStorage = {
  // key:event -> timestamp
  [keyAndEvent: string]: number;
};

type InteractionIdsStorage = {
  [key: string]: string;
};

type AnalyticsEventParams = {
  event: string;
  data: object;
};

export const SESSION_ID_KEY = "sessionId";
const MAX_SESSION_ID_AGE = 1000 * 60 * 60 * 24 * 4; // 4 days
const USER_ANALYTICS_LAST_EVENT_TIME_KEY = "USER_ANALYTICS_LAST_EVENT_TIME";

const MAX_DEDUP_INTERVAL = 1000 * 60 * 60 * 24; // 1 day
const USER_ANALYTICS_DEDUP_EVENTS_STORAGE = "USER_ANALYTICS_DEDUP_EVENTS_STORAGE";
const USER_ANALYTICS_INTERACTION_IDS_STORAGE = "USER_ANALYTICS_INTERACTION_IDS_STORAGE";

const PROCESS_QUEUE_INTERVAL_MS = 2000;

export class UserAnalytics {
  commonEventParams: CommonEventParams = {} as CommonEventParams;
  debug = false;
  earlyEventsQueue: UserAnalyticsEventItem[] = [];
  initCommonParamsRetries = 3;

  setCommonEventParams = (params: CommonEventParams) => {
    this.commonEventParams = { ...this.commonEventParams, ...params };
  };

  getIsCommonParamsInited = () => {
    return this.commonEventParams.isInited;
  };

  getLastEventTime() {
    const lastEventTime = localStorage.getItem(USER_ANALYTICS_LAST_EVENT_TIME_KEY);
    return parseInt(lastEventTime as string) || 0;
  }

  getDedupEventsStorage() {
    const dedupEventsStorageStr = localStorage.getItem(USER_ANALYTICS_DEDUP_EVENTS_STORAGE);
    const dedupEventsStorage = dedupEventsStorageStr ? (JSON.parse(dedupEventsStorageStr) as DedupEventsStorage) : {};

    return dedupEventsStorage;
  }

  getInteractionIdsStorage() {
    const interactionIdsStorageStr = localStorage.getItem(USER_ANALYTICS_INTERACTION_IDS_STORAGE);
    const interactionIdsStorage = interactionIdsStorageStr
      ? (JSON.parse(interactionIdsStorageStr) as InteractionIdsStorage)
      : {};

    return interactionIdsStorage;
  }

  setDebug = (val: boolean) => {
    this.debug = val;
  };

  setLastEventTime = (time: number) => {
    localStorage.setItem(USER_ANALYTICS_LAST_EVENT_TIME_KEY, time.toString());
  };

  shouldSkipEvent(key: string, event: string, dedupInterval: number = MAX_DEDUP_INTERVAL) {
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

  setInteractionId = (key: string, value: string) => {
    const interactionIdsStorage = this.getInteractionIdsStorage();
    interactionIdsStorage[key] = value;
    localStorage.setItem(USER_ANALYTICS_INTERACTION_IDS_STORAGE, JSON.stringify(interactionIdsStorage));
  };

  getInteractionId = (key: string) => {
    const interactionIdsStorage = this.getInteractionIdsStorage();
    return interactionIdsStorage[key];
  };

  createInteractionId = (key: string) => {
    const interactionId = Math.random().toString(36).substring(2, 15);
    this.setInteractionId(key, interactionId);
    return interactionId;
  };

  setSessionId(sessionId: string) {
    localStorage.setItem(SESSION_ID_KEY, sessionId);
    this.setLastEventTime(Date.now());
  }

  getSessionIdUrlParams() {
    const sessionIdParam = `${SESSION_ID_KEY}=${this.getOrSetSessionId()}`;
    const abFlagsParams = getAbFlagUrlParams();

    return [sessionIdParam, abFlagsParams].filter(Boolean).join("&");
  }

  getOrSetSessionId() {
    let sessionId = localStorage.getItem(SESSION_ID_KEY);

    if (!sessionId || Date.now() - this.getLastEventTime() > MAX_SESSION_ID_AGE) {
      sessionId = Math.random().toString(36).substring(2, 15);
      this.setSessionId(sessionId);
    }

    return sessionId;
  }

  pushEvent = async <T extends AnalyticsEventParams = never>(
    params: T,
    options: { onlyOncePerSession?: boolean; dedupKey?: string; dedupInterval?: number; instantSend?: boolean } = {}
  ) => {
    const sessionId = this.getOrSetSessionId();

    const dedupKey = options.dedupKey ? options.dedupKey : options.onlyOncePerSession ? sessionId : undefined;

    if (dedupKey && this.shouldSkipEvent(dedupKey, params.event, options.dedupInterval)) {
      return;
    }

    if (dedupKey) {
      this.saveDedupEventData(dedupKey, params.event);
    }

    this.setLastEventTime(Date.now());

    const item: UserAnalyticsEventItem = {
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
    };

    if (!this.getIsCommonParamsInited()) {
      this.earlyEventsQueue.push(item);
      this.processQueue();
      return;
    }

    if (options.instantSend) {
      await metrics.sendBatchItems([item], true);
    } else {
      metrics.pushBatchItem(item);
    }
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

  processQueue = async () => {
    if (this.earlyEventsQueue.length === 0) {
      return;
    }

    if (!this.getIsCommonParamsInited() && this.initCommonParamsRetries > 0) {
      if (this.debug) {
        // eslint-disable-next-line no-console
        console.log("UserAnalytics: processQueue waiting for common params");
      }

      this.initCommonParamsRetries--;

      return sleep(PROCESS_QUEUE_INTERVAL_MS).then(this.processQueue);
    }

    const items = this.earlyEventsQueue.map(this.fillCommonParams);

    await metrics.sendBatchItems(items, true);
  };

  fillCommonParams = (item: UserAnalyticsEventItem): UserAnalyticsEventItem => {
    return {
      ...item,
      payload: {
        ...item.payload,
        customFields: {
          ...item.payload.customFields,
          ...this.commonEventParams,
        },
      },
    };
  };
}

export const userAnalytics = new UserAnalytics();
