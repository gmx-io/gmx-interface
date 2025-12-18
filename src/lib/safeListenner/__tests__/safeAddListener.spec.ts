import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SafeListenersCache, safeAddGlobalListener } from "../safeAddListener";

describe("safeAddListener", () => {
  const TEST_EVENT = "test-event";
  const TEST_EVENT_2 = "test-event-2";

  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Clear instances before each test
    SafeListenersCache.instances = {};

    // Spy on globalThis methods
    addEventListenerSpy = vi.spyOn(globalThis, "addEventListener");
    removeEventListenerSpy = vi.spyOn(globalThis, "removeEventListener");
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => null);

    // Reset spies
    addEventListenerSpy.mockClear();
    removeEventListenerSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    // Clean up all listeners
    Object.keys(SafeListenersCache.instances).forEach((event) => {
      const instance = SafeListenersCache.instances[event];
      instance.cache.forEach((listener) => {
        globalThis.removeEventListener(event, listener);
      });
    });
    SafeListenersCache.instances = {};

    // Restore spies
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("SafeListenersCache", () => {
    describe("getInstance", () => {
      it("should create a new instance for a new event", () => {
        const instance1 = SafeListenersCache.getInstance(TEST_EVENT);
        expect(instance1).toBeInstanceOf(SafeListenersCache);
        expect(instance1.event).toBe(TEST_EVENT);
        expect(instance1.maxListeners).toBe(1000);
      });

      it("should return the same instance for the same event", () => {
        const instance1 = SafeListenersCache.getInstance(TEST_EVENT);
        const instance2 = SafeListenersCache.getInstance(TEST_EVENT);
        expect(instance1).toBe(instance2);
      });

      it("should create separate instances for different events", () => {
        const instance1 = SafeListenersCache.getInstance(TEST_EVENT);
        const instance2 = SafeListenersCache.getInstance(TEST_EVENT_2);
        expect(instance1).not.toBe(instance2);
        expect(instance1.event).toBe(TEST_EVENT);
        expect(instance2.event).toBe(TEST_EVENT_2);
      });

      it("should use custom maxListeners when provided", () => {
        const instance = SafeListenersCache.getInstance(TEST_EVENT, 500);
        expect(instance.maxListeners).toBe(500);
      });
    });

    describe("addListener", () => {
      it("should add a listener to globalThis", () => {
        const instance = SafeListenersCache.getInstance(TEST_EVENT);
        const listener = vi.fn();

        instance.addListener(listener);

        expect(addEventListenerSpy).toHaveBeenCalledWith(TEST_EVENT, expect.any(Function));
        expect(instance.cache).toHaveLength(1);
        expect(instance.cache[0]).toBe(listener);
      });

      it("should add multiple listeners", () => {
        const instance = SafeListenersCache.getInstance(TEST_EVENT);
        const listener1 = vi.fn();
        const listener2 = vi.fn();
        const listener3 = vi.fn();

        instance.addListener(listener1);
        instance.addListener(listener2);
        instance.addListener(listener3);

        expect(addEventListenerSpy).toHaveBeenCalledTimes(3);
        expect(instance.cache).toHaveLength(3);
        expect(instance.cache).toEqual([listener1, listener2, listener3]);
      });

      it("should remove oldest listener when maxListeners is reached", () => {
        const instance = SafeListenersCache.getInstance(TEST_EVENT, 2);
        const listener1 = vi.fn();
        const listener2 = vi.fn();
        const listener3 = vi.fn();

        instance.addListener(listener1);
        instance.addListener(listener2);
        instance.addListener(listener3);

        expect(addEventListenerSpy).toHaveBeenCalledTimes(3);
        expect(removeEventListenerSpy).toHaveBeenCalledWith(TEST_EVENT, expect.any(Function));
        expect(instance.cache).toHaveLength(2);
        expect(instance.cache).toEqual([listener2, listener3]);
      });

      it("should log error when maxListeners is reached", () => {
        const instance = SafeListenersCache.getInstance(TEST_EVENT, 1);
        const listener1 = vi.fn();
        const listener2 = vi.fn();

        instance.addListener(listener1);
        instance.addListener(listener2);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining(`Max listeners reached for event ${TEST_EVENT}`)
        );
      });

      it("should handle edge case when maxListeners is 0", () => {
        const instance = SafeListenersCache.getInstance(TEST_EVENT, 0);
        const listener = vi.fn();

        const cleanup = instance.addListener(listener);

        // When maxListeners is 0, listener should not be added at all
        expect(cleanup).toBeUndefined();
        expect(addEventListenerSpy).not.toHaveBeenCalled();
        expect(removeEventListenerSpy).not.toHaveBeenCalled();
        expect(instance.cache).toHaveLength(0);
      });

      it("should return cleanup function that removes the listener", () => {
        const instance = SafeListenersCache.getInstance(TEST_EVENT);
        const listener = vi.fn();

        const cleanup = instance.addListener(listener);

        expect(cleanup).toBeDefined();
        expect(typeof cleanup).toBe("function");
        expect(instance.cache).toHaveLength(1);

        cleanup!();

        expect(removeEventListenerSpy).toHaveBeenCalledWith(TEST_EVENT, expect.any(Function));
        expect(instance.cache).toHaveLength(0);
      });

      it("should prevent listener from being called after cleanup", () => {
        const instance = SafeListenersCache.getInstance(TEST_EVENT);
        const listener = vi.fn();

        const cleanup = instance.addListener(listener);

        cleanup!();

        globalThis.dispatchEvent(new Event(TEST_EVENT));

        expect(listener).not.toHaveBeenCalled();
      });
    });
  });

  describe("safeAddListener", () => {
    it("should add a listener using the cache", () => {
      const listener = vi.fn();

      safeAddGlobalListener(TEST_EVENT, listener);

      expect(addEventListenerSpy).toHaveBeenCalledWith(TEST_EVENT, expect.any(Function));
      const instance = SafeListenersCache.getInstance(TEST_EVENT);
      expect(instance.cache).toContain(listener);
    });

    it("should use default maxListeners when not provided", () => {
      const listener = vi.fn();

      safeAddGlobalListener(TEST_EVENT, listener);

      const instance = SafeListenersCache.getInstance(TEST_EVENT);
      expect(instance.maxListeners).toBe(1000);
    });

    it("should use custom maxListeners when provided", () => {
      const listener = vi.fn();

      safeAddGlobalListener(TEST_EVENT, listener, 50);

      const instance = SafeListenersCache.getInstance(TEST_EVENT);
      expect(instance.maxListeners).toBe(50);
    });

    it("should handle multiple calls with same event", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      safeAddGlobalListener(TEST_EVENT, listener1);
      safeAddGlobalListener(TEST_EVENT, listener2);
      safeAddGlobalListener(TEST_EVENT, listener3);

      expect(addEventListenerSpy).toHaveBeenCalledTimes(3);
      const instance = SafeListenersCache.getInstance(TEST_EVENT);
      expect(instance.cache).toHaveLength(3);
    });

    it("should handle different events independently", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      safeAddGlobalListener(TEST_EVENT, listener1);
      safeAddGlobalListener(TEST_EVENT_2, listener2);

      expect(addEventListenerSpy).toHaveBeenCalledWith(TEST_EVENT, expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith(TEST_EVENT_2, expect.any(Function));

      const instance1 = SafeListenersCache.getInstance(TEST_EVENT);
      const instance2 = SafeListenersCache.getInstance(TEST_EVENT_2);
      expect(instance1.cache).toHaveLength(1);
      expect(instance2.cache).toHaveLength(1);
    });

    it("should enforce maxListeners limit", () => {
      const maxListeners = 2;
      const listeners = Array.from({ length: 4 }, () => vi.fn());

      listeners.forEach((listener) => {
        safeAddGlobalListener(TEST_EVENT, listener, maxListeners);
      });

      expect(addEventListenerSpy).toHaveBeenCalledTimes(4);
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(2); // Removed 2 oldest
      const instance = SafeListenersCache.getInstance(TEST_EVENT);
      expect(instance.cache).toHaveLength(2);
    });

    it("should work with actual event dispatching", () => {
      const listener = vi.fn();
      const testEvent = new Event(TEST_EVENT);

      safeAddGlobalListener(TEST_EVENT, listener);

      globalThis.dispatchEvent(testEvent);

      expect(listener).toHaveBeenCalledWith(testEvent);
    });

    it("should handle listener that throws an error", () => {
      const errorListener = vi.fn(() => {
        throw new Error("Test error");
      });
      const normalListener = vi.fn();

      safeAddGlobalListener(TEST_EVENT, errorListener);
      safeAddGlobalListener(TEST_EVENT, normalListener);

      const testEvent = new Event(TEST_EVENT);

      // Should not throw, but error listener should be called
      expect(() => {
        globalThis.dispatchEvent(testEvent);
      }).not.toThrow();

      expect(errorListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
    });

    it("should return cleanup function", () => {
      const listener = vi.fn();

      const cleanup = safeAddGlobalListener(TEST_EVENT, listener);

      expect(cleanup).toBeDefined();
      expect(typeof cleanup).toBe("function");
    });

    it("should return undefined when maxListeners is 0", () => {
      const listener = vi.fn();

      const cleanup = safeAddGlobalListener(TEST_EVENT, listener, 0);

      expect(cleanup).toBeUndefined();
    });

    it("should remove listener when cleanup function is called", () => {
      const listener = vi.fn();

      const cleanup = safeAddGlobalListener(TEST_EVENT, listener);

      expect(addEventListenerSpy).toHaveBeenCalledWith(TEST_EVENT, expect.any(Function));

      cleanup!();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(TEST_EVENT, expect.any(Function));

      const instance = SafeListenersCache.getInstance(TEST_EVENT);
      expect(instance.cache).toHaveLength(0);
    });

    it("should prevent listener from being called after cleanup", () => {
      const listener = vi.fn();

      const cleanup = safeAddGlobalListener(TEST_EVENT, listener);

      cleanup!();

      globalThis.dispatchEvent(new Event(TEST_EVENT));

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("integration", () => {
    it("should maintain listener order correctly", () => {
      const instance = SafeListenersCache.getInstance(TEST_EVENT, 3);
      const callOrder: number[] = [];
      const listeners = Array.from({ length: 5 }, (_, i) => {
        return () => {
          callOrder.push(i);
        };
      });

      listeners.forEach((listener) => {
        instance.addListener(listener);
      });

      globalThis.dispatchEvent(new Event(TEST_EVENT));

      // Only the last 3 listeners should be called (oldest 2 were removed)
      expect(callOrder).toEqual([2, 3, 4]);
    });
  });
});
