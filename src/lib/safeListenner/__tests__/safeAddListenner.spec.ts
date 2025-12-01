import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SafeListennersCache, safeAddGlobalListenner } from "../safeAddListenner";

describe("safeAddListenner", () => {
  const TEST_EVENT = "test-event";
  const TEST_EVENT_2 = "test-event-2";

  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Clear instances before each test
    SafeListennersCache.instances = {};

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
    Object.keys(SafeListennersCache.instances).forEach((event) => {
      const instance = SafeListennersCache.instances[event];
      instance.cache.forEach((listener) => {
        globalThis.removeEventListener(event, listener);
      });
    });
    SafeListennersCache.instances = {};

    // Restore spies
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("SafeListennersCache", () => {
    describe("getInstance", () => {
      it("should create a new instance for a new event", () => {
        const instance1 = SafeListennersCache.getInstance(TEST_EVENT);
        expect(instance1).toBeInstanceOf(SafeListennersCache);
        expect(instance1.event).toBe(TEST_EVENT);
        expect(instance1.maxListenners).toBe(1000);
      });

      it("should return the same instance for the same event", () => {
        const instance1 = SafeListennersCache.getInstance(TEST_EVENT);
        const instance2 = SafeListennersCache.getInstance(TEST_EVENT);
        expect(instance1).toBe(instance2);
      });

      it("should create separate instances for different events", () => {
        const instance1 = SafeListennersCache.getInstance(TEST_EVENT);
        const instance2 = SafeListennersCache.getInstance(TEST_EVENT_2);
        expect(instance1).not.toBe(instance2);
        expect(instance1.event).toBe(TEST_EVENT);
        expect(instance2.event).toBe(TEST_EVENT_2);
      });

      it("should use custom maxListenners when provided", () => {
        const instance = SafeListennersCache.getInstance(TEST_EVENT, 500);
        expect(instance.maxListenners).toBe(500);
      });
    });

    describe("addListenner", () => {
      it("should add a listener to globalThis", () => {
        const instance = SafeListennersCache.getInstance(TEST_EVENT);
        const listener = vi.fn();

        instance.addListenner(listener);

        expect(addEventListenerSpy).toHaveBeenCalledWith(TEST_EVENT, expect.any(Function));
        expect(instance.cache).toHaveLength(1);
        expect(instance.cache[0]).toBe(listener);
      });

      it("should add multiple listeners", () => {
        const instance = SafeListennersCache.getInstance(TEST_EVENT);
        const listener1 = vi.fn();
        const listener2 = vi.fn();
        const listener3 = vi.fn();

        instance.addListenner(listener1);
        instance.addListenner(listener2);
        instance.addListenner(listener3);

        expect(addEventListenerSpy).toHaveBeenCalledTimes(3);
        expect(instance.cache).toHaveLength(3);
        expect(instance.cache).toEqual([listener1, listener2, listener3]);
      });

      it("should remove oldest listener when maxListenners is reached", () => {
        const instance = SafeListennersCache.getInstance(TEST_EVENT, 2);
        const listener1 = vi.fn();
        const listener2 = vi.fn();
        const listener3 = vi.fn();

        instance.addListenner(listener1);
        instance.addListenner(listener2);
        instance.addListenner(listener3);

        expect(addEventListenerSpy).toHaveBeenCalledTimes(3);
        expect(removeEventListenerSpy).toHaveBeenCalledWith(TEST_EVENT, expect.any(Function));
        expect(instance.cache).toHaveLength(2);
        expect(instance.cache).toEqual([listener2, listener3]);
      });

      it("should log error when maxListenners is reached", () => {
        const instance = SafeListennersCache.getInstance(TEST_EVENT, 1);
        const listener1 = vi.fn();
        const listener2 = vi.fn();

        instance.addListenner(listener1);
        instance.addListenner(listener2);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining(`Max listeners reached for event ${TEST_EVENT}`)
        );
      });

      it("should handle edge case when maxListenners is 0", () => {
        const instance = SafeListennersCache.getInstance(TEST_EVENT, 0);
        const listener = vi.fn();

        instance.addListenner(listener);

        expect(addEventListenerSpy).toHaveBeenCalledWith(TEST_EVENT, expect.any(Function));
        expect(removeEventListenerSpy).toHaveBeenCalledWith(TEST_EVENT, expect.any(Function));
        expect(instance.cache).toHaveLength(0);
      });
    });
  });

  describe("safeAddListenner", () => {
    it("should add a listener using the cache", () => {
      const listener = vi.fn();

      safeAddGlobalListenner(TEST_EVENT, listener);

      expect(addEventListenerSpy).toHaveBeenCalledWith(TEST_EVENT, expect.any(Function));
      const instance = SafeListennersCache.getInstance(TEST_EVENT);
      expect(instance.cache).toContain(listener);
    });

    it("should use default maxListenners when not provided", () => {
      const listener = vi.fn();

      safeAddGlobalListenner(TEST_EVENT, listener);

      const instance = SafeListennersCache.getInstance(TEST_EVENT);
      expect(instance.maxListenners).toBe(1000);
    });

    it("should use custom maxListenners when provided", () => {
      const listener = vi.fn();

      safeAddGlobalListenner(TEST_EVENT, listener, 50);

      const instance = SafeListennersCache.getInstance(TEST_EVENT);
      expect(instance.maxListenners).toBe(50);
    });

    it("should handle multiple calls with same event", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      safeAddGlobalListenner(TEST_EVENT, listener1);
      safeAddGlobalListenner(TEST_EVENT, listener2);
      safeAddGlobalListenner(TEST_EVENT, listener3);

      expect(addEventListenerSpy).toHaveBeenCalledTimes(3);
      const instance = SafeListennersCache.getInstance(TEST_EVENT);
      expect(instance.cache).toHaveLength(3);
    });

    it("should handle different events independently", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      safeAddGlobalListenner(TEST_EVENT, listener1);
      safeAddGlobalListenner(TEST_EVENT_2, listener2);

      expect(addEventListenerSpy).toHaveBeenCalledWith(TEST_EVENT, expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith(TEST_EVENT_2, expect.any(Function));

      const instance1 = SafeListennersCache.getInstance(TEST_EVENT);
      const instance2 = SafeListennersCache.getInstance(TEST_EVENT_2);
      expect(instance1.cache).toHaveLength(1);
      expect(instance2.cache).toHaveLength(1);
    });

    it("should enforce maxListenners limit", () => {
      const maxListeners = 2;
      const listeners = Array.from({ length: 4 }, () => vi.fn());

      listeners.forEach((listener) => {
        safeAddGlobalListenner(TEST_EVENT, listener, maxListeners);
      });

      expect(addEventListenerSpy).toHaveBeenCalledTimes(4);
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(2); // Removed 2 oldest
      const instance = SafeListennersCache.getInstance(TEST_EVENT);
      expect(instance.cache).toHaveLength(2);
    });

    it("should work with actual event dispatching", () => {
      const listener = vi.fn();
      const testEvent = new Event(TEST_EVENT);

      safeAddGlobalListenner(TEST_EVENT, listener);

      globalThis.dispatchEvent(testEvent);

      expect(listener).toHaveBeenCalledWith(testEvent);
    });

    it("should handle listener that throws an error", () => {
      const errorListener = vi.fn(() => {
        throw new Error("Test error");
      });
      const normalListener = vi.fn();

      safeAddGlobalListenner(TEST_EVENT, errorListener);
      safeAddGlobalListenner(TEST_EVENT, normalListener);

      const testEvent = new Event(TEST_EVENT);

      // Should not throw, but error listener should be called
      expect(() => {
        globalThis.dispatchEvent(testEvent);
      }).not.toThrow();

      expect(errorListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe("integration", () => {
    it("should maintain listener order correctly", () => {
      const instance = SafeListennersCache.getInstance(TEST_EVENT, 3);
      const callOrder: number[] = [];
      const listeners = Array.from({ length: 5 }, (_, i) => {
        return () => {
          callOrder.push(i);
        };
      });

      listeners.forEach((listener) => {
        instance.addListenner(listener);
      });

      globalThis.dispatchEvent(new Event(TEST_EVENT));

      // Only the last 3 listeners should be called (oldest 2 were removed)
      expect(callOrder).toEqual([2, 3, 4]);
    });
  });
});
