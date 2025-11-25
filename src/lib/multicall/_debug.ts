import { isDevelopment } from "config/env";
import { isWebWorker } from "config/env";

export type MulticallDebugState = {
  triggerPrimaryAsFailedInWorker?: boolean;
  triggerPrimaryAsFailedInMainThread?: boolean;
  triggerPrimaryTimeoutInWorker?: boolean;
  triggerSecondaryFailedInMainThread?: boolean;
  triggerSecondaryFailedInWorker?: boolean;
  triggerSecondaryTimeoutInWorker?: boolean;
};

export const MULTICALL_DEBUG_EVENT_NAME = "multicall:debug";
const MULTICALL_DEBUG_STATE_KEY = "multicallDebugState";

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

class MulticallDevtools {
  private listeners: Array<(event: MulticallDebugEvent) => void> = [];
  private debugState: MulticallDebugState = {};

  constructor() {
    if (typeof window !== "undefined" && !isWebWorker) {
      // Listen for debug events from worker via CustomEvent (only in main thread)
      window.addEventListener(MULTICALL_DEBUG_EVENT_NAME, this.handleDebugEvent.bind(this) as EventListener);
      this.loadDebugState();
    }
  }
  /**
   * Get debug state for passing to Multicall.call
   */
  getDebugState(): MulticallDebugState {
    if (!isDevelopment()) {
      return {};
    }

    return { ...this.debugState };
  }

  /**
   * Set debug flag
   */
  setDebugFlag<K extends keyof MulticallDebugState>(flag: K, value: boolean): void {
    if (!isDevelopment()) {
      return;
    }

    this.debugState[flag] = value;
    this.saveDebugState();
  }

  private loadDebugState(): void {
    if (!isDevelopment()) {
      return;
    }

    try {
      const stored = localStorage.getItem(MULTICALL_DEBUG_STATE_KEY);
      if (stored !== null) {
        this.debugState = JSON.parse(stored) as MulticallDebugState;
      }
    } catch (_error) {
      // Ignore errors
    }
  }

  private saveDebugState(): void {
    if (!isDevelopment()) {
      return;
    }

    try {
      localStorage.setItem(MULTICALL_DEBUG_STATE_KEY, JSON.stringify(this.debugState));
    } catch (_error) {
      // Ignore errors
    }
  }

  private handleDebugEvent(event: Event) {
    const customEvent = event as CustomEvent<MulticallDebugEvent>;
    const debugEvent = customEvent.detail;

    // Notify all listeners
    this.listeners.forEach((listener) => {
      try {
        listener(debugEvent);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[MulticallDevtools] Error in listener:", error);
      }
    });
  }

  /**
   * Subscribe to debug events
   */
  onDebugEvent(listener: (event: MulticallDebugEvent) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Dispatch debug event from worker thread
   * Uses postMessage directly to send event to main thread (more reliable than CustomEvent)
   */
  dispatchDebugEventInWorker(event: Omit<MulticallDebugEvent, "timestamp">) {
    const debugEvent: MulticallDebugEvent = {
      ...event,
      timestamp: Date.now(),
    };

    const customEvent = new CustomEvent(MULTICALL_DEBUG_EVENT_NAME, {
      detail: debugEvent,
    });
    globalThis.dispatchEvent(customEvent);
  }

  /**
   * Dispatch debug event from main thread
   * This will dispatch a CustomEvent on window, which will be handled by MulticallDevtools listeners
   */
  dispatchDebugEventInMainThread(event: Omit<MulticallDebugEvent, "timestamp">) {
    const debugEvent: MulticallDebugEvent = {
      ...event,
      timestamp: Date.now(),
    };

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(MULTICALL_DEBUG_EVENT_NAME, {
          detail: debugEvent,
        })
      );
    }
  }

  /**
   * Dispatch debug event (auto-detects context for backward compatibility)
   */
  dispatchDebugEvent(event: Omit<MulticallDebugEvent, "timestamp">) {
    // Auto-detect context
    const inWorker = Boolean(typeof self !== "undefined" && (self as any).WorkerGlobalScope);

    if (inWorker) {
      this.dispatchDebugEventInWorker(event);
    } else {
      this.dispatchDebugEventInMainThread(event);
    }
  }
}

export const multicallDevtools = new MulticallDevtools();
