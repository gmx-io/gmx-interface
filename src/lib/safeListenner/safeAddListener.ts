const DEFAULT_MAX_LISTENERS = 1000;

export class SafeListenersCache {
  cache: ((event: Event) => void)[] = [];
  wrappedListeners: Map<(event: Event) => void, (event: Event) => void> = new Map();
  static instances: Record<string, SafeListenersCache> = {};

  constructor(
    public event: string,
    public maxListeners: number = DEFAULT_MAX_LISTENERS
  ) {}

  static getInstance(event: string, maxListeners: number = DEFAULT_MAX_LISTENERS) {
    if (!this.instances[event]) {
      this.instances[event] = new SafeListenersCache(event, maxListeners);
    }
    return this.instances[event];
  }

  addListener(listener: (event: Event) => void): (() => void) | undefined {
    if (this.maxListeners === 0) {
      return undefined;
    }

    // Wrap listener to catch errors
    const wrappedListener = (event: Event) => {
      try {
        listener(event);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Error in listener for event ${this.event}:`, error);
      }
    };

    this.wrappedListeners.set(listener, wrappedListener);

    if (this.cache.length >= this.maxListeners) {
      // eslint-disable-next-line no-console
      console.error(`Max listeners reached for event ${this.event}`);
      const oldestListener = this.cache.shift();

      if (oldestListener) {
        const wrappedOldest = this.wrappedListeners.get(oldestListener);
        if (wrappedOldest) {
          globalThis.removeEventListener(this.event, wrappedOldest);
          this.wrappedListeners.delete(oldestListener);
        }
      }
    }

    globalThis.addEventListener(this.event, wrappedListener);

    this.cache.push(listener);

    return () => {
      this.removeListener(listener);
    };
  }

  removeListener(listener: (event: Event) => void) {
    const wrappedListener = this.wrappedListeners.get(listener);
    if (wrappedListener) {
      globalThis.removeEventListener(this.event, wrappedListener);
      this.wrappedListeners.delete(listener);
      const index = this.cache.indexOf(listener);
      if (index > -1) {
        this.cache.splice(index, 1);
      }
    }
  }
}

/**
 * Prevents memory leaks by limiting the number of listeners for a given event.
 * Returns a cleanup function that removes the listener.
 */
export function safeAddGlobalListener(
  event: string,
  listener: (event: Event) => void,
  maxListeners?: number
): (() => void) | undefined {
  const cache = SafeListenersCache.getInstance(event, maxListeners);
  return cache.addListener(listener);
}

/**
 * Removes a listener that was added via safeAddGlobalListener
 */
export function safeRemoveGlobalListener(event: string, listener: (event: Event) => void) {
  const cache = SafeListenersCache.getInstance(event);
  cache.removeListener(listener);
}
