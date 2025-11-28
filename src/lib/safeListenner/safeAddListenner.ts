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

  addListenner(listenner: (event: Event) => void) {
    // Wrap listener to catch errors
    const wrappedListener = (event: Event) => {
      try {
        listenner(event);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Error in listener for event ${this.event}:`, error);
      }
    };

    // Store mapping for removal
    this.wrappedListeners.set(listenner, wrappedListener);

    // Check if we need to remove oldest listener
    // Special case: if maxListenners is 0, we should remove the listener immediately after adding
    if (this.maxListenners === 0) {
      globalThis.addEventListener(this.event, wrappedListener);
      // Immediately remove it
      globalThis.removeEventListener(this.event, wrappedListener);
      this.wrappedListeners.delete(listenner);
      return;
    }

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
    // Store original listener in cache
    this.cache.push(listenner);
  }
}

/**
 * Prevents memory leaks by limiting the number of listeners for a given event.
 */
export function safeAddListenner(event: string, listenner: (event: Event) => void, maxListenners?: number) {
  const cache = SafeListennersCache.getInstance(event, maxListenners);
  cache.addListenner(listenner);
}
