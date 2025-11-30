import { isDevelopment, isWebWorker } from "config/env";
import { Storage } from "lib/storage/Storage";

export type MulticallDebugState = {
  triggerPrimaryAsFailedInWorker?: boolean;
  triggerPrimaryAsFailedInMainThread?: boolean;
  triggerPrimaryTimeoutInWorker?: boolean;
  triggerSecondaryFailedInMainThread?: boolean;
  triggerSecondaryFailedInWorker?: boolean;
  triggerSecondaryTimeoutInWorker?: boolean;
};

export const MULTICALL_DEBUG_EVENT_NAME = "multicall:debug";

export type MulticallDebugEventType =
  | "primary-start"
  | "secondary-start"
  | "primary-success"
  | "secondary-success"
  | "primary-failed"
  | "secondary-failed"
  | "primary-timeout"
  | "secondary-timeout"
  | "worker-fallback";

export type MulticallDebugEvent = {
  type: MulticallDebugEventType;
  isInWorker: boolean;
  chainId?: number;
  providerUrl?: string;
  error?: Error;
  timestamp: number;
};

class MulticallDebug {
  storage: Storage<MulticallDebugState>;
  private listeners: Array<(event: MulticallDebugEvent) => void> = [];

  constructor() {
    this.storage = new Storage<MulticallDebugState>("multicallDebugState");

    if (!isWebWorker) {
      this.selfSubscribe();
    }
  }

  getFlag(flag: keyof MulticallDebugState) {
    return this.storage.get(flag) ?? false;
  }

  setFlag(flag: keyof MulticallDebugState, value: boolean) {
    this.storage.set(flag, value);
  }

  getDebugState() {
    return this.storage.getState();
  }

  selfSubscribe() {
    globalThis.addEventListener(MULTICALL_DEBUG_EVENT_NAME, this.handleDebugEvent);
  }

  private handleDebugEvent = (event: Event) => {
    const customEvent = event as CustomEvent<MulticallDebugEvent>;
    const debugEvent = customEvent.detail;

    this.listeners.forEach((listener) => {
      try {
        listener(debugEvent);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[MulticallDevtools] Error in listener:", error);
      }
    });
  };

  onEvent(listener: (event: MulticallDebugEvent) => void): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  dispatchEvent(event: Omit<MulticallDebugEvent, "timestamp">) {
    const debugEvent: MulticallDebugEvent = {
      ...event,
      timestamp: Date.now(),
    };

    const customEvent = new CustomEvent(MULTICALL_DEBUG_EVENT_NAME, {
      detail: debugEvent,
    });

    globalThis.dispatchEvent(customEvent);
  }
}

export const _debugMulticall = isDevelopment() ? new MulticallDebug() : undefined;
