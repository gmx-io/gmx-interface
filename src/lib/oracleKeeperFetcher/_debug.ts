import { isDevelopment } from "config/env";
import { ORACLE_KEEPER_DEBUG_STATE_KEY } from "config/localStorage";
import { addFallbackTrackerListener } from "lib/FallbackTracker/events";
import { Storage } from "lib/storage/Storage";

import { OracleKeeperFetcher } from "./oracleKeeperFetcher";

export enum OracleKeeperDebugFlags {
  LogOracleKeeper = "logOracleKeeper",
  TriggerTickersFailure = "triggerTickersFailure",
  TriggerPartialTickers = "triggerPartialTickers",
}

export type OracleKeeperDebugState = {
  [OracleKeeperDebugFlags.LogOracleKeeper]: boolean;
  [OracleKeeperDebugFlags.TriggerTickersFailure]: boolean;
  [OracleKeeperDebugFlags.TriggerPartialTickers]: boolean;
};

export type OracleKeeperDebugEventType =
  | "tickers-start"
  | "tickers-success"
  | "tickers-failed"
  | "tickers-partial"
  | "endpoint-updated"
  | "endpoint-banned"
  | "tracking-finished";

export type OracleKeeperDebugEvent = {
  type: OracleKeeperDebugEventType;
  chainId: number;
  endpoint?: string;
  error?: Error;
  timestamp: number;
  data?: any;
};

class OracleKeeperDebug {
  storage: Storage<OracleKeeperDebugState>;
  private listeners: Array<(event: OracleKeeperDebugEvent) => void> = [];

  constructor() {
    this.storage = new Storage<OracleKeeperDebugState>(ORACLE_KEEPER_DEBUG_STATE_KEY);
  }

  getFlag(flag: OracleKeeperDebugFlags) {
    return this.storage.get(flag) ?? false;
  }

  setFlag(flag: OracleKeeperDebugFlags, value: boolean) {
    this.storage.set(flag, value);
  }

  getDebugState() {
    return this.storage.getState();
  }

  onEvent(listener: (event: OracleKeeperDebugEvent) => void): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  dispatchEvent(event: Omit<OracleKeeperDebugEvent, "timestamp">) {
    const debugEvent: OracleKeeperDebugEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.listeners.forEach((listener) => {
      try {
        listener(debugEvent);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[OracleKeeperDebug] Error in listener:", error);
      }
    });
  }

  subscribeForOracleKeeperDebugging(fetcher: OracleKeeperFetcher) {
    const trackerKey = fetcher.oracleTracker.fallbackTracker.trackerKey;

    addFallbackTrackerListener("endpointsUpdated", trackerKey, () => {
      this.dispatchEvent({
        type: "endpoint-updated",
        chainId: fetcher.chainId,
      });
    });

    addFallbackTrackerListener("trackingFinished", trackerKey, () => {
      this.dispatchEvent({
        type: "tracking-finished",
        chainId: fetcher.chainId,
      });
    });

    addFallbackTrackerListener("endpointBanned", trackerKey, ({ endpoint, reason }) => {
      this.dispatchEvent({
        type: "endpoint-banned",
        chainId: fetcher.chainId,
        endpoint,
        data: { reason },
      });
    });
  }
}

export const _debugOracleKeeper = isDevelopment() ? new OracleKeeperDebug() : undefined;
