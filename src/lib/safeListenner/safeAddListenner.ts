const DEFAULT_MAX_LISTENNERS = 1000;

export class SafeListennersCache {
  cache: ((event: Event) => void)[] = [];
  wrappedListeners: Map<(event: Event) => void, (event: Event) => void> = new Map();
  static instances: Record<string, SafeListennersCache> = {};

  constructor(
    public event: string,
    public maxListenners: number = DEFAULT_MAX_LISTENNERS
  ) {}

  static getInstance(event: string, maxListenners: number = DEFAULT_MAX_LISTENNERS) {
    if (!this.instances[event]) {
      this.instances[event] = new SafeListennersCache(event, maxListenners);
    }
    return this.instances[event];
  }

  addListenner(listenner: (event: Event) => void): () => void {
    if (this.maxListenners === 0) {
      return () => void 0;
    }

    // Wrap listener to catch errors
    const wrappedListener = (event: Event) => {
      try {
        listenner(event);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Error in listener for event ${this.event}:`, error);
      }
    };

    this.wrappedListeners.set(listenner, wrappedListener);

    if (this.cache.length >= this.maxListenners) {
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

    this.cache.push(listenner);

    return () => {
      this.removeListenner(listenner);
    };
  }

  removeListenner(listenner: (event: Event) => void) {
    const wrappedListener = this.wrappedListeners.get(listenner);
    if (wrappedListener) {
      globalThis.removeEventListener(this.event, wrappedListener);
      this.wrappedListeners.delete(listenner);
      const index = this.cache.indexOf(listenner);
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
export function safeAddGlobalListenner(event: string, listenner: (event: Event) => void, maxListenners?: number) {
  const cache = SafeListennersCache.getInstance(event, maxListenners);
  return cache.addListenner(listenner);
}

/**
 * Removes a listener that was added via safeAddGlobalListenner
 */
export function safeRemoveGlobalListenner(event: string, listenner: (event: Event) => void) {
  const cache = SafeListennersCache.getInstance(event);
  cache.removeListenner(listenner);
}
